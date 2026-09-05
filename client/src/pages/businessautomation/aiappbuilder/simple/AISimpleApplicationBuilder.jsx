import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
//import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import api from "../../../../services/api";
import GeneratedAppPreview from "./GeneratedAppPreview";
import ModuleTileGrid from "../../../../components/ModuleTileGrid";

const STORAGE_KEY_BASE = "augmis_ai_simple_builder_v2";

const getDraftStorageKey = (appSlug = "") =>
  appSlug
    ? `${STORAGE_KEY_BASE}:app:${appSlug}`
    : `${STORAGE_KEY_BASE}:new`;
const MAX_DISCOVERY_QUESTIONS = 5;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "pdf", "txt"];

function formatBytes(bytes = 0) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAllowedAttachment(file) {
  const extension = String(file?.name || "").split(".").pop()?.toLowerCase();
  return ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension);
}

const starterMessage = {
  role: "assistant",
  text: "Describe the application you want to build. I’ll ask only the essential questions — never more than 5 — and then I’ll generate the first frontend for you.",
};

function loadDraft(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}


function verifyBackendChange(planned = {}, verified = {}) {
  const plannedFields = Array.isArray(planned?.fields) ? planned.fields : [];
  const verifiedFields = Array.isArray(verified?.fields) ? verified.fields : [];

  for (const field of plannedFields) {
    const actual = verifiedFields.find((item) => String(item?.name) === String(field?.name));
    if (!actual) return false;
    if (field?.required !== undefined && Boolean(actual.required) !== Boolean(field.required)) return false;
    if (field?.type && String(actual.type) !== String(field.type)) return false;
    if (field?.validation?.type && String(actual?.validation?.type || "") !== String(field.validation.type)) return false;
    if (field?.validation?.compareWith && String(actual?.validation?.compareWith || "") !== String(field.validation.compareWith)) return false;
  }

  const plannedOverlap = Array.isArray(planned?.overlapRules) ? planned.overlapRules : [];
  const verifiedOverlap = Array.isArray(verified?.overlapRules) ? verified.overlapRules : [];
  for (const rule of plannedOverlap) {
    const found = verifiedOverlap.some((actual) =>
      String(actual?.resourceField || "") === String(rule?.resourceField || "") &&
      String(actual?.dateField || "") === String(rule?.dateField || "") &&
      String(actual?.startTimeField || "") === String(rule?.startTimeField || "") &&
      String(actual?.endTimeField || "") === String(rule?.endTimeField || "")
    );
    if (!found) return false;
  }

  const plannedUnique = Array.isArray(planned?.uniqueRules) ? planned.uniqueRules : [];
  const verifiedUnique = Array.isArray(verified?.uniqueRules) ? verified.uniqueRules : [];
  for (const rule of plannedUnique) {
    const fields = Array.isArray(rule?.fields) ? rule.fields.map(String).sort().join("|") : "";
    const found = verifiedUnique.some((actual) =>
      (Array.isArray(actual?.fields) ? actual.fields.map(String).sort().join("|") : "") === fields
    );
    if (!found) return false;
  }

  return true;
}

function ConversationBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", mb: 1.3 }}>
      <Box
        sx={{
          maxWidth: "88%",
          px: 1.7,
          py: 1.25,
          borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          bgcolor: isUser ? "#0b78d0" : "#f3f7fa",
          color: isUser ? "#fff" : "#193b58",
          border: isUser ? "none" : "1px solid #dfe9f1",
        }}
      >
        <Typography sx={{ fontSize: 13.2, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
          {message.text}
        </Typography>
        {message.attachment && (
          <Box
            sx={{
              mt: 1,
              px: 1,
              py: 0.7,
              borderRadius: 1.2,
              display: "flex",
              alignItems: "center",
              gap: 0.7,
              bgcolor: isUser ? "rgba(255,255,255,.12)" : "#fff",
              border: isUser ? "1px solid rgba(255,255,255,.22)" : "1px solid #dce6ef",
            }}
          >
            {String(message.attachment.kind || "").startsWith("image") ? (
              <ImageOutlinedIcon sx={{ fontSize: 16 }} />
            ) : (
              <InsertDriveFileOutlinedIcon sx={{ fontSize: 16 }} />
            )}
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {message.attachment.name}
            </Typography>
            <Typography sx={{ fontSize: 10.8, opacity: 0.75, flexShrink: 0 }}>
              {formatBytes(message.attachment.size)}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function AISimpleBuilderWorkspace({ appSlug = "", onBack, onAppCreated }) {
  const storageKey = useMemo(() => getDraftStorageKey(appSlug), [appSlug]);
  const restored = useMemo(() => loadDraft(storageKey), [storageKey]);
  const [applicationFullscreen, setApplicationFullscreen] = useState(false);
  const [messages, setMessages] = useState(restored?.messages || [starterMessage]);
  const [input, setInput] = useState("");
  const [questionCount, setQuestionCount] = useState(restored?.questionCount || 0);
  const [requirements, setRequirements] = useState(restored?.requirements || null);
  const [requirementsComplete, setRequirementsComplete] = useState(Boolean(restored?.requirementsComplete));
  const [frontendSpec, setFrontendSpec] = useState(restored?.frontendSpec || null);
  const [backendApp, setBackendApp] = useState(restored?.backendApp || null);
  const [backendSchema, setBackendSchema] = useState(restored?.backendSchema || null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(restored?.phase || "discovery");
  const [notice, setNotice] = useState({ open: false, severity: "success", text: "" });
  // File object is intentionally ephemeral and is NEVER included in localStorage.
  const [pendingAttachment, setPendingAttachment] = useState(null);
  // Genuine security/destructive boundary requests are never applied.
  // They are reported to AUGMIS Admin and stopped. Normal app changes are allowed.
  const [adminApprovalPending, setAdminApprovalPending] = useState(restored?.adminApprovalPending || null);
  const [loadingSavedApp, setLoadingSavedApp] = useState(Boolean(appSlug));
  const [loadError, setLoadError] = useState("");
  const [hydrated, setHydrated] = useState(!appSlug);
  const fileInputRef = useRef(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (!hydrated) return;

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        messages,
        questionCount,
        requirements,
        requirementsComplete,
        frontendSpec,
        backendApp,
        backendSchema,
        phase,
        adminApprovalPending,
      })
    );
  }, [
    hydrated,
    storageKey,
    messages,
    questionCount,
    requirements,
    requirementsComplete,
    frontendSpec,
    backendApp,
    backendSchema,
    phase,
    adminApprovalPending,
  ]);


  useEffect(() => {
  if (!applicationFullscreen) return;

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setApplicationFullscreen(false);
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [applicationFullscreen]);


  useEffect(() => {
    if (!appSlug) {
      setHydrated(true);
      setLoadingSavedApp(false);
      return;
    }

    let cancelled = false;

    const loadSavedApplication = async () => {
      setLoadingSavedApp(true);
      setLoadError("");
      setHydrated(false);

      try {
        const response = await api.get(
          `/aiappbuilder-simple/apps/${encodeURIComponent(appSlug)}`
        );

        if (cancelled) return;

        const app = response?.data?.app || null;
        const schema = response?.data?.schema || app?.schema_json || null;

        if (!app || !schema) {
          throw new Error("Saved AI application could not be loaded.");
        }

        const ui = schema?.ui && typeof schema.ui === "object" ? schema.ui : {};
        const savedFrontend =
          ui.frontendSpec && typeof ui.frontendSpec === "object"
            ? ui.frontendSpec
            : null;

        const savedRequirements =
          ui.requirements && typeof ui.requirements === "object"
            ? ui.requirements
            : {
                appName: app.app_name || "AI Application",
                objective: app.requirement || schema.description || "",
                primaryUsers: [],
                keyFeatures: [],
                entities: [],
                businessRules: [],
                uiNotes: [],
                dataFields: [],
              };

        if (!savedFrontend) {
          throw new Error(
            "This application does not contain a Simple Builder frontend specification."
          );
        }

        const savedDraft = loadDraft(getDraftStorageKey(appSlug));
        const restoredMessages =
          Array.isArray(savedDraft?.messages) && savedDraft.messages.length
            ? savedDraft.messages
            : [
                starterMessage,
                {
                  role: "assistant",
                  text: `Loaded ${app.app_name || "AI application"} for editing. You can ask for UI, validation, field, business-rule or feature changes.`,
                },
              ];

        setMessages(restoredMessages);
        setInput("");
        setQuestionCount(savedDraft?.questionCount || MAX_DISCOVERY_QUESTIONS);
        setRequirements(savedRequirements);
        setRequirementsComplete(true);
        setFrontendSpec(savedFrontend);
        setBackendApp(app);
        setBackendSchema(schema);
        setPendingAttachment(null);
        setAdminApprovalPending(savedDraft?.adminApprovalPending || null);
        setPhase("backend_ready");
        setHydrated(true);
      } catch (error) {
        if (cancelled) return;
        console.error("[AI_SIMPLE_LOAD_SAVED_APP]", error);
        setLoadError(
          error?.response?.data?.error ||
            error.message ||
            "Failed to load saved AI application."
        );
      } finally {
        if (!cancelled) {
          setLoadingSavedApp(false);
        }
      }
    };

    loadSavedApplication();

    return () => {
      cancelled = true;
    };
  }, [appSlug]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const showNotice = (text, severity = "success") => setNotice({ open: true, text, severity });

  const resetBuilder = () => {
    localStorage.removeItem(storageKey);
    setMessages([starterMessage]);
    setInput("");
    setQuestionCount(0);
    setRequirements(null);
    setRequirementsComplete(false);
    setFrontendSpec(null);
    setBackendApp(null);
    setBackendSchema(null);
    setPendingAttachment(null);
    setAdminApprovalPending(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPhase("discovery");
  };

  const generateFrontend = async (nextRequirements = requirements) => {
    setBusy(true);
    try {
      const response = await api.post("/aiappbuilder-simple/generate-frontend", {
        requirements: nextRequirements,
      });
      const generated = response?.data?.frontendSpec;
      setFrontendSpec(generated || null);
      setPhase("frontend_review");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I’ve generated the first frontend. Review it on the right. You can now ask for small UI changes such as layout, labels, colors, cards, fields or table arrangement.",
        },
      ]);
    } catch (error) {
      showNotice(error?.response?.data?.error || error.message || "Failed to generate frontend", "error");
    } finally {
      setBusy(false);
    }
  };


  const selectAttachment = (event) => {
    const file = event.target.files?.[0] || null;
    // Allow selecting the same filename again later.
    event.target.value = "";
    if (!file) return;

    if (!isAllowedAttachment(file)) {
      showNotice("Only PNG, JPG/JPEG, WEBP, PDF and TXT files are allowed.", "error");
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      showNotice("Maximum attachment size is 2 MB.", "error");
      return;
    }

    setPendingAttachment(file);
  };

  const readAttachment = async (file, messageText) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("message", String(messageText || ""));

    const response = await api.post("/aiappbuilder-simple/read-attachment", formData);
    const payload = response?.data || {};
    return {
      context: String(payload.context || ""),
      meta: payload.attachment || {
        name: file.name,
        size: file.size,
        mimeType: file.type,
        kind: file.type?.startsWith("image/") ? "image" : "file",
      },
    };
  };

  const handleDiscoveryMessage = async (text, attachmentContext = "", attachmentMeta = null) => {
    const userMessage = { role: "user", text, ...(attachmentMeta ? { attachment: attachmentMeta } : {}) };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setBusy(true);

    try {
      const response = await api.post("/aiappbuilder-simple/discover", {
        messages: nextMessages,
        currentRequirements: requirements,
        questionCount,
        attachmentContext,
      });

      const payload = response?.data || {};
      setRequirements(payload.requirements || requirements);
      setRequirementsComplete(Boolean(payload.requirementsComplete));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: payload.assistantMessage || "I have enough information to build the first version." },
      ]);

      if (payload.status === "needs_information") {
        setQuestionCount((prev) => Math.min(MAX_DISCOVERY_QUESTIONS, prev + 1));
        setPhase("discovery");
      } else {
        setPhase("ready_for_frontend");
        setRequirementsComplete(true);
        setTimeout(() => generateFrontend(payload.requirements || requirements), 100);
      }
    } catch (error) {
      showNotice(error?.response?.data?.error || error.message || "AI requirement discovery failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const checkSecurityRisk = async ({ text, attachmentContext = "" }) => {
    const appName =
      backendSchema?.appName ||
      frontendSpec?.appTitle ||
      requirements?.appName ||
      "AI Simple Application";

    const response = await api.post("/aiappbuilder-simple/security-check", {
      message: text,
      attachmentContext,
      appName,
      appSlug: backendApp?.app_slug || "",
      phase,
    });

    return response?.data || { blocked: false };
  };

  const handleApplicationChange = async (text, attachmentContext = "", attachmentMeta = null) => {
    const userMessage = { role: "user", text, ...(attachmentMeta ? { attachment: attachmentMeta } : {}) };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setBusy(true);
    setPhase("applying_change");

    try {
      const response = await api.post("/aiappbuilder-simple/apply-change", {
        requirements,
        frontendSpec,
        backendSchema,
        backendConnected: Boolean(backendApp?.app_slug),
        changeRequest: text,
        messages: nextMessages,
        attachmentContext,
      });

      const plan = response?.data || {};

      if (plan.action === "clarify") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: plan.clarificationQuestion || "I need one more detail before I can safely apply that change.",
          },
        ]);
        return;
      }

      const nextFrontend = plan.updatedFrontendSpec || frontendSpec;
      const plannedBackend = plan.updatedBackendSchema || backendSchema;
      let verifiedBackend = backendSchema;

      // For an already-built Simple application, persist BOTH backend changes
      // and UI-only changes into schema_json.ui.frontendSpec. This allows the
      // landing page to reopen the latest saved design for editing.
      if (
        backendApp?.app_slug &&
        (plan.backendChanged || plan.frontendChanged)
      ) {
        const schemaToPersist = JSON.parse(
          JSON.stringify(plannedBackend || backendSchema || {})
        );

        schemaToPersist.ui = {
          ...(backendSchema?.ui || {}),
          ...(schemaToPersist.ui || {}),
          builder: "simple",
          builderVersion: 2,
          requirements,
          frontendSpec: nextFrontend,
        };

        await api.patch(`/aiappbuilder/${backendApp.app_slug}/schema`, {
          schema: schemaToPersist,
        });

        const verifyResponse = await api.get(
          `/aiappbuilder/${backendApp.app_slug}/schema`
        );
        verifiedBackend = verifyResponse?.data?.schema || null;

        if (!verifiedBackend) {
          throw new Error(
            "The application was updated, but the saved schema could not be reloaded."
          );
        }

        if (
          plan.backendChanged &&
          !verifyBackendChange(schemaToPersist, verifiedBackend)
        ) {
          throw new Error(
            "The backend responded, but the requested schema/business-rule change could not be verified."
          );
        }

        if (
          plan.frontendChanged &&
          !verifiedBackend?.ui?.frontendSpec
        ) {
          throw new Error(
            "The frontend change could not be verified in the saved application."
          );
        }
      } else if (plannedBackend) {
        // Before Build Backend this remains an in-memory draft only.
        verifiedBackend = plannedBackend;
      }

      // Apply frontend only after any required persistence succeeded.
      if (plan.frontendChanged && nextFrontend) {
        setFrontendSpec(nextFrontend);
      }
      if (verifiedBackend) {
        setBackendSchema(verifiedBackend);
      }

      const sections = [];
      if (plan.frontendChanged) {
        sections.push(`Frontend\n✓ ${plan.frontendSummary || "Frontend updated"}`);
      }
      if (plan.backendChanged) {
        sections.push(
          backendApp?.app_slug
            ? `Backend\n✓ ${plan.backendSummary || "Backend rule/schema updated and verified"}`
            : `Backend draft\n✓ ${plan.backendSummary || "Prepared for Build Backend"}`
        );
      }
      if (!plan.frontendChanged && !plan.backendChanged) {
        sections.push(plan.assistantSummary || "No structural change was required.");
      }

      const heading =
        plan.backendChanged && backendApp?.app_slug
          ? "✓ Change applied and verified."
          : "✓ Change applied.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `${heading}\n\n${sections.join("\n\n")}`,
        },
      ]);

      showNotice(
        plan.backendChanged && backendApp?.app_slug
          ? "Change applied and backend verified."
          : "Change applied.",
        "success"
      );
    } catch (error) {
      console.error("[AI_SIMPLE_APPLY_CHANGE]", error);
      const message = error?.response?.data?.error || error.message || "Could not apply change";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `⚠ I could not complete and verify that change, so I have not marked it as done.\n\n${message}`,
        },
      ]);
      showNotice(message, "error");
    } finally {
      setBusy(false);
      setPhase(backendApp?.app_slug ? "backend_ready" : "frontend_review");
    }
  };

  const sendMessage = async () => {
    const typedText = input.trim();
    const file = pendingAttachment;
    if ((!typedText && !file) || busy) return;

    const text = typedText || (frontendSpec
      ? "Use the attached reference for this application change."
      : "Use the attached reference to help define this application.");

    let attachmentContext = "";
    let attachmentMeta = null;

    setBusy(true);

    try {
      // Raw attachment bytes remain temporary: browser memory -> server RAM -> AI
      // request -> discarded. They are not persisted in localStorage or PostgreSQL.
      if (file) {
        const result = await readAttachment(file, text);
        attachmentContext = result.context;
        attachmentMeta = result.meta;
        setPendingAttachment(null);
      }

      // SECURITY SCREEN COMES BEFORE discovery/change execution.
      // Only genuine destructive/security-boundary requests are blocked.
      const security = await checkSecurityRisk({
        text,
        attachmentContext,
      });

      setInput("");

      if (security?.blocked) {
        const userMessage = {
          role: "user",
          text,
          ...(attachmentMeta ? { attachment: attachmentMeta } : {}),
        };

        const assistantText = security.notificationSent
          ? "AUGMIS Admin approval is required for this request. The administrators have been notified. No changes have been applied."
          : "AUGMIS Admin approval is required for this request. No changes have been applied. The automatic administrator notification could not be sent.";

        setMessages((prev) => [
          ...prev,
          userMessage,
          { role: "assistant", text: assistantText },
        ]);

        setAdminApprovalPending({
          actionType: "SECURITY_RISK",
          changeType: security.category || "security_risk",
          summary: security.reason || "",
          requestedAt: new Date().toISOString(),
          notificationSent: Boolean(security.notificationSent),
        });

        showNotice(
          security.notificationSent
            ? "Security-sensitive request stopped and sent to AUGMIS Admin."
            : "Security-sensitive request stopped. Admin notification could not be sent.",
          security.notificationSent ? "warning" : "error"
        );

        setPhase(backendApp?.app_slug ? "backend_ready" : frontendSpec ? "frontend_review" : "discovery");
        return;
      }

      // A previous security alert should not lock the application builder.
      // Its chat history remains, but normal subsequent work can continue.
      setAdminApprovalPending(null);

      if (frontendSpec) {
        await handleApplicationChange(text, attachmentContext, attachmentMeta);
        return;
      }

      await handleDiscoveryMessage(text, attachmentContext, attachmentMeta);
    } catch (error) {
      console.error("[AI_SIMPLE_ATTACHMENT_OR_SECURITY_SEND]", error);
      const message = error?.response?.data?.error || error.message || "Could not process this request";
      showNotice(message, "error");

      // Keep the attachment selected if processing failed before it was accepted.
      if (file && !attachmentMeta) setPendingAttachment(file);
    } finally {
      setBusy(false);
    }
  };

  const handleBuildBackend = async () => {
    if (!frontendSpec || busy || backendApp) return;

    setBusy(true);
    setPhase("backend_building");

    try {
      const specResponse = await api.post("/aiappbuilder-simple/build-backend-spec", {
        requirements,
        frontendSpec,
        messages,
      });

      const schema = specResponse?.data?.schema;
      if (!schema) {
        throw new Error("Backend specification was not generated");
      }

      const appName =
        schema.appName ||
        frontendSpec?.appTitle ||
        requirements?.appName ||
        "AI Simple Application";

      const requirementText =
        requirements?.objective ||
        frontendSpec?.appSubtitle ||
        "Created with AUGMIS AI Simple Application Builder";

      // Controlled existing App Builder endpoint. AI itself does not execute SQL.
      const createResponse = await api.post("/aiappbuilder", {
        appName,
        requirement: requirementText,
        schema,
      });

      const createdApp = createResponse?.data;
      if (!createdApp?.app_slug) {
        throw new Error("Application was created but no app_slug was returned");
      }

      setBackendSchema(schema);
      setBackendApp(createdApp);
      setPhase("backend_ready");

      const backendReadyMessage = {
        role: "assistant",
        text: `Backend connected successfully. The application now uses ${createdApp.table_name || `cust_${createdApp.app_slug}`} and live AUGMIS record APIs.`,
      };
      const nextMessages = [...messages, backendReadyMessage];

      setMessages(nextMessages);

      localStorage.setItem(
        getDraftStorageKey(createdApp.app_slug),
        JSON.stringify({
          messages: nextMessages,
          questionCount,
          requirements,
          requirementsComplete: true,
          frontendSpec,
          backendApp: createdApp,
          backendSchema: schema,
          phase: "backend_ready",
          adminApprovalPending: null,
        })
      );
      localStorage.removeItem(storageKey);

      showNotice("Backend built successfully. The preview is now connected to live data.", "success");

      if (onAppCreated) {
        onAppCreated(createdApp.app_slug);
      }
    } catch (error) {
      console.error("[AI_SIMPLE_BUILD_BACKEND]", error);
      setPhase("frontend_review");
      showNotice(
        error?.response?.data?.error || error.message || "Failed to build backend",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  if (loadingSavedApp) {
    return (
      <Box
        sx={{
          minHeight: "calc(100vh - 72px)",
          display: "grid",
          placeItems: "center",
          bgcolor: "#f5f6f7",
        }}
      >
        <Stack alignItems="center" spacing={1.5}>
          <CircularProgress size={28} />
          <Typography sx={{ color: "#61788d", fontSize: 13 }}>
            Loading AI application…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box
        sx={{
          minHeight: "calc(100vh - 72px)",
          display: "grid",
          placeItems: "center",
          bgcolor: "#f5f6f7",
          px: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 520,
            border: "1px solid #dce2e8",
            p: 3,
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontWeight: 800, color: "#173854", mb: 1 }}>
            Application could not be opened
          </Typography>
          <Typography sx={{ color: "#73879a", fontSize: 12.5, mb: 2 }}>
            {loadError}
          </Typography>
          <Button
            variant="contained"
            onClick={onBack}
            startIcon={<ArrowBackRoundedIcon />}
            sx={{ textTransform: "none" }}
          >
            Back to AI Applications
          </Button>
        </Paper>
      </Box>
    );
  }

  const phaseLabel =
    phase === "backend_ready"
      ? "Backend Connected"
      : phase === "applying_change"
        ? "Applying Change"
        : phase === "backend_building"
        ? "Building Backend"
        : phase === "frontend_review"
          ? "Frontend Review"
          : requirementsComplete
            ? "Requirements Complete"
            : `Discovery ${questionCount}/${MAX_DISCOVERY_QUESTIONS}`;

  return (
    <Box sx={{ height: "calc(100vh - 72px)", minHeight: 640, bgcolor: "#edf3f8", overflow: "hidden" }}>
     {!applicationFullscreen && (
      <Box
        sx={{
          height: 68,
          px: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "#fff",
          borderBottom: "1px solid #dce6ef",
        }}
      >
        <Stack direction="row" spacing={1.1} alignItems="center">
          <Tooltip title="Back to AI Applications">
            <IconButton
              onClick={onBack}
              size="small"
              sx={{
                width: 34,
                height: 34,
                border: "1px solid #dce5ed",
                borderRadius: 1.5,
                color: "#49657d",
                bgcolor: "#fff",
              }}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: "#e8f4fd", display: "grid", placeItems: "center" }}>
            <AutoAwesomeRoundedIcon sx={{ color: "#0b78d0" }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 850, color: "#123553" }}>
              AI Simple Application Builder
            </Typography>
            <Typography sx={{ fontSize: 12.3, color: "#71869a" }}>
              Describe → clarify → generate frontend → refine → build backend
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            icon={backendApp || requirementsComplete ? <CheckCircleRoundedIcon /> : <ChatBubbleOutlineRoundedIcon />}
            label={phaseLabel}
            sx={{
              bgcolor: backendApp || requirementsComplete ? "#edf9f2" : "#eef5fb",
              color: backendApp || requirementsComplete ? "#177245" : "#356989",
              fontWeight: 700,
            }}
          />
          {!appSlug && (
            <Tooltip title="Start over">
              <IconButton
                onClick={resetBuilder}
                size="small"
                sx={{ border: "1px solid #dce5ed", borderRadius: 1.5 }}
              >
                <RestartAltRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Button
            variant="contained"
            startIcon={<BuildRoundedIcon />}
            disabled={!frontendSpec || busy || Boolean(backendApp)}
            onClick={handleBuildBackend}
            sx={{ textTransform: "none", bgcolor: "#123b64", boxShadow: "none", borderRadius: 1.5, px: 2 }}
          >
            {backendApp ? "Backend Ready" : "Build Backend"}
          </Button>
        </Stack>
      </Box>
)}
      <Box
  sx={{
    display: "grid",

    gridTemplateColumns: applicationFullscreen
      ? "minmax(0, 1fr)"
      : {
          xs: "1fr",
          md: "390px minmax(0, 1fr)",
        },

    height: applicationFullscreen
      ? "100%"
      : "calc(100% - 68px)",

    minHeight: 0,
  }}
>
      {!applicationFullscreen && (
        <Paper square sx={{ display: "flex", flexDirection: "column", minHeight: 0, borderRight: "1px solid #dce6ef", boxShadow: "none" }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #edf2f6" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#173854", fontSize: 14.5 }}>AI Design Conversation</Typography>
                <Typography sx={{ color: "#8294a5", fontSize: 11.5 }}>Maximum 5 clarification questions</Typography>
              </Box>
              {!frontendSpec && (
                    <Chip
                      size="small"
                      icon={<VisibilityOutlinedIcon />}
                      label="Discovery"
                      sx={{ height: 24, fontSize: 11 }}
                    />
                  )}
            </Stack>
          </Box>

          <Box ref={scrollerRef} sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 1.5, bgcolor: "#fff" }}>
            {messages.map((message, index) => (
              <ConversationBubble key={`${message.role}-${index}`} message={message} />
            ))}
            {busy && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#71869a", px: 1, py: 1 }}>
                <CircularProgress size={15} />
                <Typography sx={{ fontSize: 12 }}>AUGMIS AI is working…</Typography>
              </Box>
            )}
          </Box>

          <Divider />
          <Box sx={{ p: 1.5, bgcolor: "#fbfcfd" }}>
            {frontendSpec && (
              <Typography sx={{ fontSize: 11.3, color: "#74899d", mb: 0.8 }}>
                Ask for any normal application change — UI, validation, fields, business rules or features. Only genuine destructive/security-boundary requests are stopped and sent to AUGMIS Admin.
              </Typography>
            )}
            {adminApprovalPending && (
              <Box
                sx={{
                  mb: 1,
                  p: 1.1,
                  border: "1px solid #f1c77d",
                  bgcolor: "#fff8e8",
                  borderRadius: 1.5,
                }}
              >
                <Typography sx={{ fontSize: 11.8, fontWeight: 800, color: "#805400", mb: 0.4 }}>
                  Security review required
                </Typography>
                <Typography sx={{ fontSize: 10.9, color: "#775f35", lineHeight: 1.45 }}>
                  A security/destructive boundary request was stopped and sent to AUGMIS Admin for review. No change from that request was applied.
                </Typography>
              </Box>
            )}

            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,image/png,image/jpeg,image/webp,application/pdf,text/plain"
              onChange={selectAttachment}
            />

            {pendingAttachment && (
              <Box
                sx={{
                  mb: 1,
                  px: 1.1,
                  py: 0.8,
                  border: "1px solid #d7e4ee",
                  borderRadius: 1.4,
                  bgcolor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                }}
              >
                {pendingAttachment.type?.startsWith("image/") ? (
                  <ImageOutlinedIcon sx={{ fontSize: 18, color: "#0b78d0" }} />
                ) : (
                  <InsertDriveFileOutlinedIcon sx={{ fontSize: 18, color: "#0b78d0" }} />
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 11.7, fontWeight: 750, color: "#294760", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {pendingAttachment.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: "#7c90a2" }}>
                    {formatBytes(pendingAttachment.size)} · temporary · not saved
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setPendingAttachment(null)}
                  disabled={busy}
                  aria-label="Remove attachment"
                >
                  <CloseRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Box>
            )}

            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              value={input}
              disabled={false}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={frontendSpec ? "Describe a UI, validation or application-rule change…" : "Example: Build a meeting room booking app…"}
              sx={{
                "& .MuiOutlinedInput-root": { bgcolor: "#fff", alignItems: "flex-end" },
              }}
              InputProps={{
                endAdornment: (
                  <Stack direction="row" spacing={0.2} alignItems="center" sx={{ mb: 0.1 }}>
                    <Tooltip title="Attach image, PDF or TXT (max 2 MB)">
                      <span>
                        <IconButton
                          onClick={() => fileInputRef.current?.click()}
                          disabled={busy}
                          aria-label="Attach reference file"
                          sx={{ color: pendingAttachment ? "#0b78d0" : "#60798f" }}
                        >
                          <AttachFileRoundedIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <IconButton
                      onClick={sendMessage}
                      disabled={(!input.trim() && !pendingAttachment) || busy}
                      sx={{ color: "#0b78d0" }}
                      aria-label="Send message"
                    >
                      <SendRoundedIcon />
                    </IconButton>
                  </Stack>
                ),
              }}
            />
          </Box>
        </Paper>
)}
        <Box sx={{ minWidth: 0, minHeight: 0 }}>
          <GeneratedAppPreview
            spec={frontendSpec}
            backendApp={backendApp}
            backendSchema={backendSchema}
            onNotice={showNotice}

            applicationFullscreen={applicationFullscreen}
            onToggleApplicationFullscreen={() =>
              setApplicationFullscreen((prev) => !prev)
            }
          />
        </Box>
      </Box>

      <Snackbar
        open={notice.open}
        autoHideDuration={3500}
        onClose={() => setNotice((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={notice.severity} variant="filled" onClose={() => setNotice((prev) => ({ ...prev, open: false }))}>
          {notice.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}


function AISimpleApplicationsLanding({ onCreate, onOpen }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadApps = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/aiappbuilder-simple/apps");

        if (!cancelled) {
          setApps(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.response?.data?.error ||
              loadError.message ||
              "Failed to load AI applications."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadApps();

    return () => {
      cancelled = true;
    };
  }, []);

  const tiles = useMemo(
    () =>
      apps.map((app) => {
        const schema =
          app?.schema_json && typeof app.schema_json === "object"
            ? app.schema_json
            : {};

        const description =
          schema?.description ||
          app?.requirement ||
          "AI-generated business application";

        const modifiedValue = app?.date_modified || app?.date_created;
        const modified = modifiedValue
          ? new Date(modifiedValue).toLocaleDateString()
          : "";

        return {
          id: app.id,
          label: app.app_name || "Untitled AI Application",
          desc: [
            description,
            app.status ? `Status: ${app.status}` : null,
            modified ? `Modified: ${modified}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          searchText: [
            app.app_name,
            app.app_slug,
            app.table_name,
            app.requirement,
            app.status,
          ]
            .filter(Boolean)
            .join(" "),
          Icon: AutoAwesomeRoundedIcon,
          iconColor: "#2563eb",
          onClick: () => onOpen(app.app_slug),
        };
      }),
    [apps, onOpen]
  );

  const showEmptyState =
    loading || error || (!loading && !error && apps.length === 0);

  return (
    <ModuleTileGrid
      title="AI Applications"
      subtitle="Create, open and refine applications built with AUGMIS AI Simple Application Builder."
      searchPlaceholder="Search AI applications"
      tiles={tiles}
      primaryAction={{
        label: "Create New AI Application",
        onClick: onCreate,
      }}
    >
      {showEmptyState ? (
        <Box
          sx={{
            minHeight: 190,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            px: 2,
          }}
        >
          {loading ? (
            <Stack alignItems="center" spacing={1.2}>
              <CircularProgress size={26} />
              <Typography sx={{ fontSize: 12.5, color: "#708295" }}>
                Loading AI applications…
              </Typography>
            </Stack>
          ) : error ? (
            <Alert severity="error" sx={{ maxWidth: 650 }}>
              {error}
            </Alert>
          ) : (
            <Box>
              <AutoAwesomeRoundedIcon
                sx={{ fontSize: 34, color: "#6f8aa3", mb: 1 }}
              />
              <Typography sx={{ fontWeight: 800, color: "#294760", mb: 0.5 }}>
                No AI applications yet
              </Typography>
              <Typography sx={{ fontSize: 12.2, color: "#7b8ea0" }}>
                Click Create New AI Application to build your first application.
              </Typography>
            </Box>
          )}
        </Box>
      ) : null}
    </ModuleTileGrid>
  );
}

export default function AISimpleApplicationBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appSlug = String(searchParams.get("app") || "").trim();
  const isCreating = searchParams.get("new") === "1";

  const openLanding = () => {
    navigate("/aiappbuilder/simple");
  };

  const createNew = () => {
    localStorage.removeItem(getDraftStorageKey(""));
    navigate("/aiappbuilder/simple?new=1");
  };

  const openApplication = (slug) => {
    if (!slug) return;

    navigate(
      `/aiappbuilder/simple?app=${encodeURIComponent(slug)}`
    );
  };

  if (!isCreating && !appSlug) {
    return (
      <AISimpleApplicationsLanding
        onCreate={createNew}
        onOpen={openApplication}
      />
    );
  }

  return (
    <AISimpleBuilderWorkspace
      key={appSlug || "new"}
      appSlug={appSlug}
      onBack={openLanding}
      onAppCreated={openApplication}
    />
  );
}
