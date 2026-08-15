export const defaultMailContent = {
  body: "",
  dear_recipient: false,
  include_report: false,
  report_ref: "",
  click_here_enabled: false,
  click_here_text: "",
  click_here_url: "",
  attach_pdf: false,
  wrap_content: true,
};

export const wrapMailBody = (html = "", enable = false) => {
  const marker = 'data-mail-wrap="1"';
  const alreadyWrapped = html.includes(marker);
  if (enable) {
    if (alreadyWrapped) return html;
    return `<div ${marker} style="border:1px solid #d1d5db;border-radius:5px;padding:12px;max-width:640px;margin:0 auto;">${html}</div>`;
  }
  if (!alreadyWrapped) return html;
  return html.replace(/<div[^>]*data-mail-wrap="1"[^>]*>([\s\S]*?)<\/div>/i, "$1");
};

export const sanitizeHtmlLTR = (html = "") => {
  let h = html;
  h = h.replace(/\sdir\s*=\s*"(.*?)"/gi, "");
  h = h.replace(/\sdir\s*=\s*'(.*?)'/gi, "");
  h = h.replace(/\sstyle\s*=\s*"(.*?)"/gi, (m, p1) => {
    const cleaned = p1
      .replace(/direction\s*:\s*rtl\s*;?/gi, "")
      .replace(/unicode-bidi\s*:\s*.*?;?/gi, "")
      .replace(/writing-mode\s*:\s*.*?;?/gi, "");
    return cleaned.trim() ? ` style="${cleaned}"` : "";
  });
  h = h.replace(/\sstyle\s*=\s*'(.*?)'/gi, (m, p1) => {
    const cleaned = p1
      .replace(/direction\s*:\s*rtl\s*;?/gi, "")
      .replace(/unicode-bidi\s*:\s*.*?;?/gi, "")
      .replace(/writing-mode\s*:\s*.*?;?/gi, "");
    return cleaned.trim() ? ` style='${cleaned}'` : "";
  });
  return h;
};
