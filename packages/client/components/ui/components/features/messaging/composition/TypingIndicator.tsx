import { For, Match, Switch } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { User } from "stoat.js";
import { styled } from "styled-system/jsx";

import { useUsers } from "@revolt/markdown/users";
import { Avatar, typography } from "@revolt/ui/components/design";
import { OverflowingText } from "@revolt/ui/components/utils";

interface Props {
  /**
   * Users who are typing
   */
  users: (User | undefined)[];

  /**
   * Own user ID
   */
  ownId: string;
}

/**
 * Display typing user information
 */
export function TypingIndicator(props: Props) {
  /**
   * Generate list of user IDs
   * @returns User IDs
   */
  const userIds = () =>
    (
      props.users.filter(
        (user) =>
          typeof user !== "undefined" &&
          user.id !== props.ownId &&
          user.relationship !== "Blocked",
      ) as User[]
    )
      .sort((a, b) => a!.id.toUpperCase().localeCompare(b!.id.toUpperCase()))
      .map((user) => user.id);

  const users = useUsers(userIds, true);

  return (
    <Switch fallback={<Bar />}>
      <Match when={users().length}>
        <Bar>
          <Avatars>
            <For each={users()}>
              {(user, index) => (
                <Avatar
                  src={user!.avatar}
                  size={15}
                  holepunch={
                    index() + 1 < users().length ? "overlap-subtle" : "none"
                  }
                />
              )}
            </For>
          </Avatars>
          <OverflowingText class={typography({ class: "body", size: "small" })}>
            <Switch fallback={<>{users()[0]!.username} 외 {users().length - 1}명이 입력 중…</>}>
              <Match when={users().length === 1}>
                {users()[0]!.username} 님이 입력 중…
              </Match>
              <Match when={users().length < 5}>
                {users().map((user) => user!.username).join(" 님, ")} 님이 입력 중…
              </Match>
            </Switch>
          </OverflowingText>
        </Bar>
      </Match>
    </Switch>
  );
}

/**
 * Avatar alignment
 */
const Avatars = styled("div", {
  base: {
    display: "flex",
    flexShrink: 0,
    height: "fit-content",

    "& :not(:first-child)": {
      marginInlineStart: "-6px",
    },
  },
});

/**
 * Styles for the typing indicator
 */
const Bar = styled("div", {
  base: {
    width: "100%",
    minHeight: "26px",

    padding: "0 var(--gap-lg)",
    borderRadius: "var(--borderRadius-lg)",

    display: "flex",
    gap: "var(--gap-md)",

    userSelect: "none",
    alignItems: "center",
    flexDirection: "row",

    color: "var(--md-sys-color-on-surface)",
  },
});
