import { createSignal } from "solid-js";

import { Handler } from "mdast-util-to-hast";
import { styled } from "styled-system/jsx";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

const Spoiler = styled("span", {
  base: {
    padding: "0 2px",
    borderRadius: "var(--borderRadius-md)",
  },
  variants: {
    shown: {
      true: {
        color: "var(--md-sys-color-inverse-on-surface)",
        background: "var(--md-sys-color-inverse-surface)",
      },
      false: {
        cursor: "pointer",
        userSelect: "none",
        color: "transparent",
        background: "#151515",

        "> *": {
          opacity: 0,
          pointerEvents: "none",
        },
      },
    },
  },
});

export function RenderSpoiler(props: { children: Element }) {
  const [shown, setShown] = createSignal(false);

  return (
    <Spoiler shown={shown()} onClick={() => setShown(true)}>
      {props.children}
    </Spoiler>
  );
}

export const remarkSpoiler: Plugin = () => (tree) => {
  visit(
    tree,
    "paragraph",
    (
      node: {
        children: (
          | { type: "text"; value: string }
          | { type: "paragraph"; children: any[] }
          | { type: "spoiler"; children: any[] }
        )[];
      },
      idx,
      parent,
    ) => {
      // Visitor state
      let lastIndexOffset = 0;

      // Visit all children of paragraphs
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        // Find the next text element to start a spoiler from
        if (child.type === "text") {
          const matches = [...child.value.matchAll(/\[\[([\s\S]+?)\]\]/gm)];
          if (!matches.length) continue;

          const contents: typeof node.children = [];

          for (const match of matches) {
            const content = match[1];
            const before = child.value.slice(lastIndexOffset, match.index);

            if (before) {
              contents.push({
                type: "text",
                value: before,
              });
            }

            contents.push({
              type: "spoiler",
              children: [
                {
                  type: "text",
                  value: content,
                },
              ],
            });

            lastIndexOffset = match.index + match[0].length;
          }

          const after = child.value.slice(lastIndexOffset);
          if (after) {
            contents.push({
              type: "text",
              value: after,
            });
          }

          node.children.splice(i, 1, ...contents);
        }
      }
    },
  );
};

export const spoilerHandler: Handler = (h, node) => {
  return {
    type: "element" as const,
    tagName: "spoiler",
    children: h.all({
      type: "paragraph",
      children: node.children,
    }),
    properties: {},
  };
};
