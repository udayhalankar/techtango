import React, { useMemo } from "react";
import { normalizePageSpec } from "./pageSpecNormalizer";
import { composeLayoutModel } from "./LayoutComposer";
import { resolveResponsivePlan } from "./ResponsiveAdapter";
import AppShell from "./AppShell";
import PageCanvas from "./PageCanvas";

const PageRenderer = ({ pageSpec, showEditorChrome = true, onShellSlotOptions, onWidgetOptions }) => {
  const normalizedPage = useMemo(() => normalizePageSpec(pageSpec || {}), [pageSpec]);
  const model = useMemo(() => composeLayoutModel(normalizedPage), [normalizedPage]);
  const responsivePlan = useMemo(() => resolveResponsivePlan(normalizedPage), [normalizedPage]);

  return (
    <AppShell
      page={normalizedPage}
      theme={model.theme}
      responsivePlan={responsivePlan}
      showEditorChrome={showEditorChrome}
      onShellSlotOptions={onShellSlotOptions}
    >
      <PageCanvas page={normalizedPage} theme={model.theme} onWidgetOptions={onWidgetOptions} />
    </AppShell>
  );
};

export default PageRenderer;
