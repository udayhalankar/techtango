export const resolveResponsivePlan = (pageSpec = {}) => {
  const viewport = String(pageSpec?.behaviors?.previewDevice || "desktop").toLowerCase();
  if (viewport === "mobile") {
    return { viewport, shellColumns: 1, contentColumns: 1 };
  }
  if (viewport === "tablet") {
    return { viewport, shellColumns: 1, contentColumns: 1 };
  }
  return { viewport: "desktop", shellColumns: 2, contentColumns: 1 };
};

export default resolveResponsivePlan;
