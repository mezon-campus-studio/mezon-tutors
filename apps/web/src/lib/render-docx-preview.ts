const DOCX_RENDER_OPTIONS = {
  inWrapper: true,
  ignoreWidth: true,
  ignoreHeight: true,
  breakPages: false,
} as const;

function fitDocxWrapperToContainer(
  container: HTMLElement,
  wrapper: HTMLElement,
): void {
  wrapper.style.transform = "";
  wrapper.style.transformOrigin = "";
  wrapper.style.width = "";
  wrapper.style.marginBottom = "";

  const availableWidth = container.clientWidth;
  const contentWidth = wrapper.scrollWidth;
  if (availableWidth <= 0 || contentWidth <= 0 || contentWidth <= availableWidth) {
    return;
  }

  const scale = availableWidth / contentWidth;
  wrapper.style.transformOrigin = "top center";
  wrapper.style.transform = `scale(${scale})`;
  wrapper.style.width = `${contentWidth}px`;
  wrapper.style.marginBottom = `${wrapper.scrollHeight * scale - wrapper.scrollHeight}px`;
}

/**
 * Renders a DOCX buffer into a container and scales it to fit narrow viewports (mobile).
 */
export async function renderDocxPreviewResponsive(
  buffer: ArrayBuffer,
  container: HTMLElement,
): Promise<() => void> {
  const { renderAsync } = await import("docx-preview");
  container.innerHTML = "";

  await renderAsync(buffer, container, undefined, DOCX_RENDER_OPTIONS);

  const wrapper = container.querySelector(".docx-wrapper");
  if (!(wrapper instanceof HTMLElement)) {
    return () => {
      container.innerHTML = "";
    };
  }

  const fit = () => fitDocxWrapperToContainer(container, wrapper);
  fit();

  const resizeObserver = new ResizeObserver(fit);
  resizeObserver.observe(container);

  return () => {
    resizeObserver.disconnect();
    container.innerHTML = "";
  };
}
