import { For, Match, Show, Switch, createResource } from "solid-js";

import { Channel } from "stoat.js";
import { cva } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { renderSimpleMarkdown } from "@revolt/markdown";
import { useState } from "@revolt/state";
import { useNavigate } from "@revolt/routing";
import { Avatar, Header, iconSize, main } from "@revolt/ui";

import MdHome from "@material-design-icons/svg/filled/home.svg?component-solid";

import { HeaderIcon } from "./common/CommonHeader";

const Base = styled("div", {
  base: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    color: "var(--md-sys-color-on-surface)",
    overflow: "hidden",
  },
});

const content = cva({
  base: {
    ...main.raw(),
    padding: "24px",
    gap: "0",
    alignItems: "stretch",
    justifyContent: "flex-start",
    overflowY: "auto",
  },
});

const Grid = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "12px",
    width: "100%",
  },
});

const Tile = styled("div", {
  base: {
    aspectRatio: "16/9",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-variant)",
    color: "var(--md-sys-color-on-surface-variant)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    cursor: "pointer",
    transition: "background 0.15s",
    _hover: {
      background: "var(--md-sys-color-surface-container-high)",
    },
  },
});

const TileHeader = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 12px 8px",
    borderBottom: "1px solid var(--md-sys-color-outline-variant)",
    flexShrink: 0,
  },
});

const TileName = styled("span", {
  base: {
    fontWeight: "600",
    fontSize: "13px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: "1 1 0",
    color: "var(--md-sys-color-on-surface)",
  },
});

const MessageList = styled("div", {
  base: {
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
});

const SkeletonRow = styled("div", {
  base: {
    height: "calc(12px * 1.4)",
    borderRadius: "var(--borderRadius-sm)",
    background: "var(--md-sys-color-outline-variant)",
    opacity: 0.5,
    animation: "pulse 1.5s ease-in-out infinite",
  },
});

const SKELETON_WIDTHS = ["72%", "88%", "60%", "80%"];

const MessageRow = styled("div", {
  base: {
    fontSize: "12px",
    lineHeight: "1.4",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    color: "var(--md-sys-color-on-surface-variant)",
  },
});

const AuthorName = styled("span", {
  base: {
    fontWeight: "600",
    color: "var(--md-sys-color-on-surface)",
    marginInline: "4px",
  },
});

const Timestamp = styled("span", {
  base: {
    fontSize: "11px",
    color: "var(--md-sys-color-outline)",
    fontFamily: "monospace",
    marginRight: "2px",
  },
});

const Section = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
  },
});

const SectionTitle = styled("h2", {
  base: {
    fontSize: "15px",
    fontWeight: "700",
    letterSpacing: "0.04em",
    color: "var(--md-sys-color-on-surface)",
    margin: "0",
    padding: "0 0 0 8px",
  },
});

/**
 * Home page — shows a grid of recent channels with message previews
 */
export function HomePage() {
  const client = useClient();
  const state = useState();
  const navigate = useNavigate();

  const allConversations = () => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return client()!
      .channels.toList()
      .filter((ch) => {
        if (
          !ch.lastMessageId ||
          (!((ch.type === "DirectMessage" && ch.active) ||
            ch.type === "Group" ||
            ch.type === "TextChannel"))
        )
          return false;
        return +ch.updatedAt >= oneWeekAgo;
      })
      .sort((a, b) => +b.updatedAt - +a.updatedAt);
  };

  const dmConversations = () =>
    allConversations().filter((ch) => ch.type === "DirectMessage");

  const otherConversations = () =>
    allConversations().filter((ch) => ch.type !== "DirectMessage");

  return (
    <Base>
      <Header placement="primary">
        <HeaderIcon>
          <MdHome {...iconSize(22)} />
        </HeaderIcon>
        홈
      </Header>
      <div use:scrollable={{ class: content() }}>
        <Show when={dmConversations().length > 0}>
          <Section>
            <SectionTitle>다이렉트 메시지</SectionTitle>
            <Grid>
              <For each={dmConversations()}>
                {(channel) => (
                  <ChannelTile
                    channel={channel}
                    onClick={() => navigate(`/channel/${channel.id}`)}
                  />
                )}
              </For>
            </Grid>
          </Section>
        </Show>
        <Show when={otherConversations().length > 0}>
          <Section style={{ "margin-top": dmConversations().length > 0 ? "24px" : "0" }}>
            <SectionTitle>채널 및 그룹</SectionTitle>
            <Grid>
              <For each={otherConversations()}>
                {(channel) => (
                  <ChannelTile
                    channel={channel}
                    onClick={() => navigate(`/channel/${channel.id}`)}
                  />
                )}
              </For>
            </Grid>
          </Section>
        </Show>
      </div>
    </Base>
  );
}

function ChannelTile(props: { channel: Channel; onClick: () => void }) {
  const [messages] = createResource(
    () => props.channel.id,
    async () => {
      const { messages } = await props.channel.fetchMessagesWithUsers({
        limit: 4,
      });
      return messages.reverse();
    },
  );

  const channelName = () => {
    if (props.channel.type === "DirectMessage") {
      return props.channel.recipient?.displayName ?? "Unknown";
    }
    if (props.channel.type === "TextChannel") {
      const serverName = props.channel.server?.name;
      return serverName
        ? `${serverName} · ${props.channel.name}`
        : props.channel.name;
    }
    return props.channel.name ?? "Unknown";
  };

  return (
    <Tile onClick={props.onClick}>
      <TileHeader>
        <Switch>
          <Match when={props.channel.type === "Group"}>
            <Avatar
              size={24}
              shape="rounded-square"
              fallback={channelName()}
              src={props.channel.iconURL}
              primaryContrast
            />
          </Match>
          <Match when={props.channel.type === "TextChannel"}>
            <Avatar
              size={24}
              shape="rounded-square"
              fallback={props.channel.server?.name}
              src={props.channel.server?.iconURL}
              primaryContrast
            />
          </Match>
          <Match when={props.channel.type === "DirectMessage"}>
            <Avatar size={24} src={props.channel.iconURL} />
          </Match>
        </Switch>
        <TileName>{channelName()}</TileName>
      </TileHeader>
      <MessageList>
        <Show
          when={!messages.loading}
          fallback={
            <For each={SKELETON_WIDTHS}>
              {(width) => <SkeletonRow style={{ width }} />}
            </For>
          }
        >
        <For each={messages()}>
          {(message) => (
            <Show when={message.content}>
              <MessageRow>
                <Timestamp>
                  {message.createdAt.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </Timestamp>
                <AuthorName>{message.username}</AuthorName>
                {renderSimpleMarkdown(message.content.replace(/\n+/g, " "))}
              </MessageRow>
            </Show>
          )}
        </For>
        </Show>
      </MessageList>
    </Tile>
  );
}
