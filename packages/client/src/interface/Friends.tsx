import {
  Accessor,
  JSX,
  Match,
  Show,
  Switch,
  createMemo,
  createSignal,
  splitProps,
} from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { VirtualContainer } from "@minht11/solid-virtual-container";
import type { User } from "stoat.js";
import { styled } from "styled-system/jsx";

import { UserContextMenu } from "@revolt/app";
import { useClient } from "@revolt/client";
import { useModals } from "@revolt/modal";
import {
  Avatar,
  Badge,
  Deferred,
  Header,
  IconButton,
  List,
  ListItem,
  ListSubheader,
  NavigationRail,
  NavigationRailItem,
  OverflowingText,
  Spacer,
  UserStatus,
  main,
} from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { HeaderIcon } from "./common/CommonHeader";

/**
 * Base layout of the friends page
 */
const Base = styled("div", {
  base: {
    width: "100%",
    display: "flex",
    flexDirection: "column",

    "& .FriendsList": {
      height: "100%",
      paddingInline: "var(--gap-lg)",
    },
  },
});

/**
 * Friends menu
 */
export function Friends() {
  const { t } = useLingui();
  const client = useClient();
  const { openModal } = useModals();

  /**
   * Reference to the parent scroll container
   */
  let scrollTargetElement!: HTMLDivElement;

  /**
   * Signal required for reacting to ref changes
   */
  const targetSignal = () => scrollTargetElement;

  /**
   * Generate lists of all users
   */
  const lists = createMemo(() => {
    const list = client()!.users.toList();

    const friends = list
      .filter((user) => user.relationship === "Friend")
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      friends,
      online: friends.filter((user) => user.online),
      incoming: list
        .filter((user) => user.relationship === "Incoming")
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      outgoing: list
        .filter((user) => user.relationship === "Outgoing")
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      blocked: list
        .filter((user) => user.relationship === "Blocked")
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    };
  });

  const pending = () => {
    const incoming = lists().incoming;
    return incoming.length > 99 ? "99+" : incoming.length;
  };

  const [page, setPage] = createSignal("all");

  return (
    <Base>
      <Header placement="primary">
        <HeaderIcon>
          <Symbol>group</Symbol>
        </HeaderIcon>
        <Trans>Friends</Trans>
        <Spacer />

        <IconButton
          variant={page() === "all" ? "filled" : undefined}
          onPress={() => setPage("all")}
          use:floating={{
            tooltip: {
              placement: "left",
              content: '모든 친구',
            },
          }}
        >
          <Symbol>all_inbox</Symbol>
        </IconButton>

        <IconButton
          variant={page() === "online" ? "filled" : undefined}
          onPress={() => setPage("online")}
          use:floating={{
            tooltip: {
              placement: "left",
              content: '온라인 친구',
            },
          }}
        >
          <Symbol>waving_hand</Symbol>
        </IconButton>

        <IconButton
          variant={page() === "pending" ? "filled" : undefined}
          onPress={() => setPage("pending")}
          use:floating={{
            tooltip: {
              placement: "left",
              content: '요청',
            },
          }}
        >
          <Symbol>notifications</Symbol>
          <Show when={pending()}>
            <Badge slot="badge" variant="large">
              {pending()}
            </Badge>
          </Show>
        </IconButton>

        <IconButton
          onPress={() =>
            openModal({
              type: "add_friend",
              client: client(),
            })
          }
          use:floating={{
            tooltip: {
              placement: "left",
              content: t`Add a new friend`,
            },
          }}
        >
          <Symbol>add</Symbol>
        </IconButton>
      </Header>

      <main class={main()}>
        <div
          style={{
            position: "relative",
            "min-height": 0,
          }}
        >
          <Deferred>
            <div class="FriendsList" ref={scrollTargetElement} use:scrollable>
              <Switch
                fallback={
                  <People
                    title="온라인 친구"
                    users={lists().online}
                    scrollTargetElement={targetSignal}
                  />
                }
              >
                <Match when={page() === "all"}>
                  <People
                    title="모든 친구"
                    users={lists().friends}
                    scrollTargetElement={targetSignal}
                  />
                </Match>
                <Match when={page() === "pending"}>
                  <People
                    title="받은 요청"
                    users={lists().incoming}
                    scrollTargetElement={targetSignal}
                  />
                  <People
                    title="보낸 요청"
                    users={lists().outgoing}
                    scrollTargetElement={targetSignal}
                  />
                </Match>
                <Match when={page() === "blocked"}>
                  <People
                    title="Blocked"
                    users={lists().blocked}
                    scrollTargetElement={targetSignal}
                  />
                </Match>
              </Switch>
            </div>
          </Deferred>
        </div>
      </main>
    </Base>
  );
}

/**
 * List of users
 */
function People(props: {
  users: User[];
  title: string;
  scrollTargetElement: Accessor<HTMLDivElement>;
}) {
  return (
    <List>
      <ListSubheader>
        {props.title} {"–"} {props.users.length}
      </ListSubheader>

      <Show when={props.users.length === 0}>
        <ListItem disabled>
          여기는 아무도 없어요.
        </ListItem>
      </Show>

      <VirtualContainer
        items={props.users}
        scrollTarget={props.scrollTargetElement()}
        itemSize={{ height: 58 }}
        // grid rendering:
        // itemSize={{ height: 60, width: 240 }}
        // crossAxisCount={(measurements) =>
        //   Math.floor(measurements.container.cross / measurements.itemSize.cross)
        // }
        // width: 100% needs to be removed from listentry below for this to work ^^^
      >
        {(item) => (
          <ContainerListEntry
            style={{
              ...item.style,
            }}
          >
            <Entry
              role="listitem"
              tabIndex={item.tabIndex}
              style={item.style}
              user={item.item}
            />
          </ContainerListEntry>
        )}
      </VirtualContainer>
    </List>
  );
}

const ContainerListEntry = styled("div", {
  base: {
    width: "100%",
  },
});

/**
 * Single user entry
 */
function Entry(
  props: { user: User } & Omit<
    JSX.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  >,
) {
  const { openModal } = useModals();
  const [local, remote] = splitProps(props, ["user"]);

  return (
    <a
      {...remote}
      use:floating={{
        contextMenu: () => <UserContextMenu user={local.user} />,
      }}
      onClick={() => openModal({ type: "user_profile", user: local.user })}
    >
      <ListItem>
        <Avatar
          slot="icon"
          size={36}
          src={local.user.animatedAvatarURL}
          holepunch={
            props.user.relationship === "Friend" ? "bottom-right" : "none"
          }
          overlay={
            <Show when={props.user.relationship === "Friend"}>
              <UserStatus.Graphic
                status={props.user.status?.presence ?? "Online"}
              />
            </Show>
          }
        />
        <OverflowingText>{local.user.displayName}</OverflowingText>
      </ListItem>
    </a>
  );
}
