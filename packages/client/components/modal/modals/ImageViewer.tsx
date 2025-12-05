import {
  Match,
  Show,
  Switch,
  createEffect,
  createSignal,
  on,
  onCleanup,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Motion, Presence } from "solid-motionone";

import Panzoom, { PanzoomObject } from "@panzoom/panzoom";
import { File as StoatFile } from "stoat.js";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { Column, Dialog, DialogProps, IconButton, Text } from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { Modals } from "../types";

interface AttachmentsResponse {
  attachments: (StoatFile & { message_id: string })[];
}

export function ImageViewerModal(
  props: DialogProps & Modals & { type: "image_viewer" },
) {
  const client = useClient();
  const [ref, setRef] = createSignal<HTMLElement>();
  const [currentFile, setCurrentFile] = createSignal<typeof props.file>();
  const [currentMessageId, setCurrentMessageId] = createSignal<string>();
  const [isNavigating, setIsNavigating] = createSignal(false);
  // Track attachments in current message for multi-image navigation
  const [currentMessageAttachments, setCurrentMessageAttachments] =
    createSignal<AttachmentsResponse["attachments"]>([]);
  // Store original File objects from props for same-message navigation
  const [propsAttachments, setPropsAttachments] = createSignal<StoatFile[]>([]);
  const [currentAttachmentIndex, setCurrentAttachmentIndex] = createSignal(0);

  let panzoom: PanzoomObject;

  // Initialize currentFile and currentMessageId from props
  createEffect(
    on(
      () => [props.file, props.messageId, props.messageAttachments] as const,
      ([file, messageId, messageAttachments]) => {
        setCurrentFile(file);
        setCurrentMessageId(messageId);

        // Initialize with provided message attachments if available
        if (messageAttachments && messageAttachments.length > 0 && file) {
          // Store original File objects for same-message navigation
          setPropsAttachments(messageAttachments);
          // Clear API-fetched attachments since we have props attachments
          setCurrentMessageAttachments([]);

          // Find the index of the current file in the attachments
          const currentIndex = messageAttachments.findIndex(
            (f) => f.id === file.id,
          );
          setCurrentAttachmentIndex(currentIndex >= 0 ? currentIndex : 0);
        } else {
          // Reset multi-image state when modal opens without attachments info
          setPropsAttachments([]);
          setCurrentMessageAttachments([]);
          setCurrentAttachmentIndex(0);
        }
      },
    ),
  );

  /**
   * Fetch adjacent image from API
   * @param direction "before" for older images, "after" for newer images
   */
  async function fetchAdjacentImage(direction: "before" | "after") {
    if (!props.channelId || !currentMessageId() || isNavigating()) return;

    const apiAttachments = currentMessageAttachments();
    const initialAttachments = propsAttachments();
    const currentIndex = currentAttachmentIndex();

    // Check if we can navigate within props attachments (initial message)
    if (initialAttachments.length > 1) {
      if (
        direction === "after" &&
        currentIndex < initialAttachments.length - 1
      ) {
        // Move to next attachment in same message
        const nextIndex = currentIndex + 1;
        setCurrentFile(initialAttachments[nextIndex]);
        setCurrentAttachmentIndex(nextIndex);
        panzoom?.reset();
        return;
      } else if (direction === "before" && currentIndex > 0) {
        // Move to previous attachment in same message
        const prevIndex = currentIndex - 1;
        setCurrentFile(initialAttachments[prevIndex]);
        setCurrentAttachmentIndex(prevIndex);
        panzoom?.reset();
        return;
      }
    }

    // Check if we can navigate within API-fetched attachments
    if (apiAttachments.length > 1) {
      if (direction === "after" && currentIndex < apiAttachments.length - 1) {
        // Move to next attachment in same message
        const nextIndex = currentIndex + 1;
        const attachment = apiAttachments[nextIndex];
        const newFile = new StoatFile(client(), attachment as never);
        setCurrentFile(newFile);
        setCurrentAttachmentIndex(nextIndex);
        panzoom?.reset();
        return;
      } else if (direction === "before" && currentIndex > 0) {
        // Move to previous attachment in same message
        const prevIndex = currentIndex - 1;
        const attachment = apiAttachments[prevIndex];
        const newFile = new StoatFile(client(), attachment as never);
        setCurrentFile(newFile);
        setCurrentAttachmentIndex(prevIndex);
        panzoom?.reset();
        return;
      }
    }

    // Need to fetch from another message - clear props attachments since we're leaving initial message
    setPropsAttachments([]);
    setIsNavigating(true);

    try {
      const baseUrl = client().options.baseURL;
      const queryParams = new URLSearchParams();
      queryParams.append("limit", "1");
      queryParams.append(direction, currentMessageId()!);
      queryParams.append("sort", direction === "before" ? "Latest" : "Oldest");

      const url = `${baseUrl}/channels/${props.channelId}/attachments?${queryParams.toString()}`;
      const [headerName, headerValue] = client().authenticationHeader;

      const fetchResponse = await fetch(url, {
        headers: { [headerName]: headerValue },
      });
      const response = (await fetchResponse.json()) as AttachmentsResponse;

      if (response.attachments.length > 0) {
        // Store all attachments from this message for multi-image navigation
        setCurrentMessageAttachments(response.attachments);

        // When going "before" (older), start from the last attachment
        // When going "after" (newer), start from the first attachment
        const targetIndex =
          direction === "before" ? response.attachments.length - 1 : 0;
        const attachment = response.attachments[targetIndex];

        const newFile = new StoatFile(client(), attachment as never);
        setCurrentFile(newFile);
        setCurrentMessageId(attachment.message_id);
        setCurrentAttachmentIndex(targetIndex);

        // Reset panzoom when image changes
        panzoom?.reset();
      }
    } catch (e) {
      console.error("Failed to fetch adjacent image:", e);
    } finally {
      setIsNavigating(false);
    }
  }

  // Keyboard navigation
  createEffect(() => {
    if (!props.show || !props.channelId) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        fetchAdjacentImage("before"); // older image
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        fetchAdjacentImage("after"); // newer image
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  createEffect(
    on(
      () => ref(),
      (ref) => {
        if (ref) {
          ref.addEventListener("mousedown", (e) => {
            // prevent panzoom from panning when
            // context menu is triggered (or other
            // non-dragging buttons are used!)
            if (e.button !== 0) {
              e.preventDefault();
            }
          });

          const zoom = Panzoom(ref, {
            minScale: 0.1,
            maxScale: 5,
          });

          panzoom = zoom;

          function onMouseWheel(event: WheelEvent) {
            zoom.zoom(zoom.getScale() - event.deltaY / 1000);
          }

          document.addEventListener("mousewheel", onMouseWheel as never);

          onCleanup(() => {
            document.removeEventListener("mousewheel", onMouseWheel as never);
            zoom.destroy();
          });
        }
      },
    ),
  );

  return (
    <Portal mount={document.getElementById("floating")!}>
      <Dialog.Scrim
        dark
        padding={false}
        overflow={false}
        show={props.show}
        onClick={props.onClose}
      >
        <Presence>
          <Show when={props?.show}>
            <Motion.div
              class={css({
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",

                minHeight: 0,
                width: "100%",
                height: "100%",

                paddingInline: "20px",
              })}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{
                duration: 0.3,
                easing: [0.17, 0.67, 0.58, 0.98],
              }}
            >
              <Relative>
                <Bar>
                  <Switch fallback={<div />}>
                    <Match when={currentFile()}>
                      <Card onClick={(e) => e.stopPropagation()}>
                        <Column>
                          <Text class="title">{currentFile()!.filename}</Text>
                          <Text class="label">
                            {currentFile()!.humanReadableSize}
                          </Text>
                        </Column>
                      </Card>
                    </Match>
                  </Switch>
                  <Card onClick={(e) => e.stopPropagation()}>
                    <IconButton onPress={() => panzoom?.zoomOut()}>
                      <Symbol>zoom_out</Symbol>
                    </IconButton>
                    <IconButton onPress={() => panzoom?.zoomIn()}>
                      <Symbol>zoom_in</Symbol>
                    </IconButton>
                    <Show when={currentFile()}>
                      <a
                        target="_blank"
                        href={currentFile()?.originalUrl}
                        download={currentFile()?.filename}
                      >
                        <IconButton>
                          <Symbol>download</Symbol>
                        </IconButton>
                      </a>
                    </Show>
                    <Show when={props.embed || props.gif}>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={props.embed?.url || props.gif?.url}
                      >
                        <IconButton>
                          <Symbol>open_in_new</Symbol>
                        </IconButton>
                      </a>
                    </Show>
                    <IconButton onPress={props.onClose}>
                      <Symbol>close</Symbol>
                    </IconButton>
                  </Card>
                </Bar>
              </Relative>
              {/* Navigation buttons */}
              <Show when={props.channelId && currentFile()}>
                <NavButton
                  position="left"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchAdjacentImage("before");
                  }}
                  disabled={isNavigating()}
                >
                  <Symbol>chevron_left</Symbol>
                </NavButton>
                <NavButton
                  position="right"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchAdjacentImage("after");
                  }}
                  disabled={isNavigating()}
                >
                  <Symbol>chevron_right</Symbol>
                </NavButton>
              </Show>
              <Switch>
                <Match when={currentFile()}>
                  <Image
                    ref={setRef}
                    style={{
                      "aspect-ratio": `${(currentFile()!.metadata as { width: number }).width}/${(currentFile()!.metadata as { height: number }).height}`,
                    }}
                    src={currentFile()!.originalUrl}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Match>
                <Match when={props.embed}>
                  <Image
                    ref={setRef}
                    style={{
                      "aspect-ratio": `${props.embed!.width}/${props.embed!.height}`,
                    }}
                    src={props.embed!.proxiedURL}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Match>
                <Match when={props.gif}>
                  <Video
                    ref={setRef}
                    loop
                    muted
                    autoplay
                    style={{
                      "aspect-ratio": `${props.gif!.width}/${props.gif!.height}`,
                    }}
                    src={props.gif!.url}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Match>
              </Switch>
              <div />
            </Motion.div>
          </Show>
        </Presence>
      </Dialog.Scrim>
    </Portal>
  );
}

const Image = styled("img", {
  base: {
    minHeight: 0,
    alignSelf: "center",
    objectFit: "contain",

    background: "rgba(0, 0, 0, 0.6)",
  },
});

const Video = styled("video", {
  base: {
    minHeight: 0,
    alignSelf: "center",
    objectFit: "contain",

    background: "rgba(0, 0, 0, 0.6)",
  },
});

const Relative = styled("div", {
  base: {
    position: "relative",
  },
});

const Bar = styled("div", {
  base: {
    width: "100%",
    position: "absolute",

    height: "120px",
    flexShrink: 0,

    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const Card = styled("div", {
  base: {
    zIndex: 999,
    display: "flex",
    gap: "var(--gap-md)",
    padding: "var(--gap-md)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface)",
    color: "var(--md-sys-color-on-surface)",
  },
});

const NavButton = styled("button", {
  base: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 999,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    width: "48px",
    height: "48px",
    padding: 0,
    border: "none",
    borderRadius: "50%",

    background: "var(--md-sys-color-surface)",
    color: "var(--md-sys-color-on-surface)",
    cursor: "pointer",

    transition: "opacity 0.2s, background 0.2s",

    "&:hover": {
      background: "var(--md-sys-color-surface-container-high)",
    },

    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
  variants: {
    position: {
      left: {
        left: "20px",
      },
      right: {
        right: "20px",
      },
    },
  },
});
