import { For, Show, createEffect, createSignal, on, onCleanup } from "solid-js";

import { Channel, File as StoatFile } from "stoat.js";
import { cva } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { ContextMenu, ContextMenuButton } from "@revolt/app/menus/ContextMenu";
import { useClient } from "@revolt/client";
import { useNavigate } from "@revolt/routing";
import { CircularProgress, Text } from "@revolt/ui";
import { Attachment } from "@revolt/ui/components/features/messaging/elements/Attachment";

import MdOpenInNew from "@material-design-icons/svg/outlined/open_in_new.svg?component-solid";

interface Props {
  channel: Channel;
}

interface AttachmentsResponse {
  attachments: (StoatFile & { message_id: string })[];
}

type Attachment = [StoatFile, string];

/**
 * Attachments sidebar component with infinite scroll
 */
export function AttachmentsSidebar(props: Props) {
  const client = useClient();
  const navigate = useNavigate();
  const [attachments, setAttachments] = createSignal<Attachment[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [hasMore, setHasMore] = createSignal(true);
  const [error, setError] = createSignal<string>();

  let sentinelRef: HTMLDivElement | undefined;

  const LIMIT = 30;

  /**
   * Fetch attachments from the API
   */
  async function fetchAttachments(before?: string) {
    if (loading()) return;

    setLoading(true);
    setError(undefined);

    try {
      // Build query string manually since this endpoint is not typed in stoat-api
      const queryParams = new URLSearchParams();
      queryParams.append("limit", String(LIMIT));
      if (before) {
        queryParams.append("before", before);
      }

      // Use full URL to bypass stoat-api's query parameter handling
      const baseUrl = client().options.baseURL;
      const url = `${baseUrl}/channels/${props.channel.id}/attachments?${queryParams.toString()}`;
      const [headerName, headerValue] = client().authenticationHeader;

      const fetchResponse = await fetch(url, {
        headers: { [headerName]: headerValue },
      });
      const response = (await fetchResponse.json()) as AttachmentsResponse;

      const newAttachments = response.attachments.map<Attachment>((file) => [
        new StoatFile(client(), file as never),
        file.message_id,
      ]);

      if (newAttachments.length < LIMIT) {
        setHasMore(false);
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Reset and fetch when channel changes
  createEffect(
    on(
      () => props.channel.id,
      () => {
        setAttachments([]);
        setHasMore(true);
        setError(undefined);
        fetchAttachments();
      },
    ),
  );

  // Setup intersection observer for infinite scroll
  createEffect(() => {
    if (!sentinelRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore() && !loading()) {
          const items = attachments();
          const lastItem = items[items.length - 1];
          if (lastItem) {
            fetchAttachments(lastItem[1]);
          }
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(sentinelRef);
    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      <Show when={error()}>
        <ErrorMessage>
          <Text>{error()}</Text>
        </ErrorMessage>
      </Show>

      <Show when={attachments().length === 0 && !loading() && !error()}>
        <EmptyMessage>
          <Text>첨부파일이 없습니다.</Text>
        </EmptyMessage>
      </Show>

      <AttachmentGrid>
        <For each={attachments()}>
          {([file, messageId]) => (
            <Attachment
              file={file}
              thumbnail
              contextMenu={() => (
                <ContextMenu>
                  <ContextMenuButton
                    icon={MdOpenInNew}
                    onClick={() =>
                      navigate(
                        `/server/${props.channel.serverId}/channel/${props.channel.id}/${messageId}`,
                      )
                    }
                  >
                    메시지로 이동
                  </ContextMenuButton>
                </ContextMenu>
              )}
            />
          )}
        </For>
      </AttachmentGrid>

      <Show when={loading()}>
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      </Show>

      <div ref={sentinelRef} class={sentinel} />
    </>
  );
}

/**
 * Grid container for attachments (3 columns)
 */
const AttachmentGrid = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "var(--gap-sm)",
    padding: "var(--gap-sm)",
  },
});

/**
 * Empty state message
 */
const EmptyMessage = styled("div", {
  base: {
    padding: "var(--gap-lg)",
    textAlign: "center",
    color: "var(--md-sys-color-on-surface-variant)",
  },
});

/**
 * Error message
 */
const ErrorMessage = styled("div", {
  base: {
    padding: "var(--gap-md)",
    textAlign: "center",
    color: "var(--md-sys-color-error)",
  },
});

/**
 * Loading container
 */
const LoadingContainer = styled("div", {
  base: {
    display: "flex",
    justifyContent: "center",
    padding: "var(--gap-md)",
  },
});

/**
 * Intersection observer sentinel
 */
const sentinel = cva({
  base: {
    height: "1px",
  },
})();
