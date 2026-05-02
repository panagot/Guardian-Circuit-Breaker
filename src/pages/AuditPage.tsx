import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  InputBase,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import {
  IconBolt,
  IconFileText,
  IconHistory,
  IconSearch,
  IconUsers,
} from "@tabler/icons-react";

import {
  CardHeader,
  EmptyState,
  KpiCard,
  PageHeader,
  PageMotion,
  StatusPill,
} from "../components";
import { COLORS, SHADOWS } from "../theme";
import {
  stagePillLabel,
  useSimulation,
  type EventLevel,
  type SimEvent,
} from "../simulation";

type AuditCategory =
  | "Policy"
  | "Vault"
  | "Governance"
  | "Operator"
  | "System";

interface AuditEntry {
  id: string;
  time: string;
  date: string;
  actor: string;
  action: string;
  target: string;
  category: AuditCategory;
  result: "Success" | "Pending" | "Failed";
}

const BASELINE_ENTRIES: AuditEntry[] = [
  {
    id: "AU-7830",
    time: "23:51:11",
    date: "Yesterday",
    actor: "Guardian #4",
    action: "Voted YES",
    target: "GIP-021",
    category: "Governance",
    result: "Success",
  },
  {
    id: "AU-7821",
    time: "23:42:08",
    date: "Yesterday",
    actor: "Protocol Ops",
    action: "Updated allowlist",
    target: "0xSAFE…4D21",
    category: "Vault",
    result: "Success",
  },
  {
    id: "AU-7813",
    time: "22:31:55",
    date: "Yesterday",
    actor: "Guardian #1",
    action: "Queued execution",
    target: "GIP-019",
    category: "Governance",
    result: "Success",
  },
  {
    id: "AU-7805",
    time: "21:18:02",
    date: "Yesterday",
    actor: "Observer",
    action: "Attempted manual pause",
    target: "Bridge / withdraw",
    category: "Operator",
    result: "Failed",
  },
  {
    id: "AU-7791",
    time: "18:02:14",
    date: "Yesterday",
    actor: "Guardian #5",
    action: "Rotated guardian key",
    target: "0x7f…aA31",
    category: "Operator",
    result: "Success",
  },
  {
    id: "AU-7783",
    time: "12:49:30",
    date: "Yesterday",
    actor: "Ika policy engine",
    action: "Edge case observed",
    target: "POL-002",
    category: "Policy",
    result: "Success",
  },
];

const CATEGORIES: Array<"All" | AuditCategory> = [
  "All",
  "Policy",
  "Vault",
  "Governance",
  "Operator",
  "System",
];

const CATEGORY_TONES: Record<AuditCategory, { fg: string; bg: string }> = {
  Policy: { fg: COLORS.primary, bg: COLORS.primarySoft },
  Vault: { fg: COLORS.accent, bg: COLORS.accentSoft },
  Governance: { fg: "#7c3aed", bg: "#f5f3ff" },
  Operator: { fg: COLORS.warning, bg: COLORS.warningSoft },
  System: { fg: COLORS.textSecondary, bg: COLORS.bg },
};

function levelToCategory(evt: SimEvent): AuditCategory {
  const src = evt.source.toLowerCase();
  if (src.includes("policy") || src.includes("ika")) return "Policy";
  if (src.includes("vault") || src.includes("orchestrator")) return "Vault";
  if (src.includes("governance")) return "Governance";
  if (src.includes("guardian")) return "System";
  return "System";
}

function levelToResult(level: EventLevel): "Success" | "Pending" | "Failed" {
  if (level === "critical") return "Pending";
  if (level === "warning") return "Pending";
  return "Success";
}

function makeAuditId(idx: number) {
  // Continue numbering from baseline ceiling
  return `AU-${(8000 + idx).toString().padStart(4, "0")}`;
}

function simEventsToEntries(events: SimEvent[]): AuditEntry[] {
  // Show events in audit-relevant categories only (skip pure 'info').
  return events
    .filter(
      (e) =>
        e.level !== "info" ||
        e.source.toLowerCase().includes("governance") ||
        e.source.toLowerCase().includes("guardian"),
    )
    .map((e, i) => ({
      id: makeAuditId(events.length - i),
      time: `00:${e.ts.replace(":", ":")}`,
      date: "Today",
      actor: e.source,
      action: e.message,
      target: e.detail
        ? e.detail.split("·")[0]?.trim() || "Live signal"
        : "Live signal",
      category: levelToCategory(e),
      result: levelToResult(e.level),
    }));
}

export default function AuditPage() {
  const sim = useSimulation();
  const [category, setCategory] = useState<"All" | AuditCategory>("All");
  const [actor, setActor] = useState("All actors");
  const [query, setQuery] = useState("");

  const entries = useMemo<AuditEntry[]>(
    () => [...simEventsToEntries(sim.events), ...BASELINE_ENTRIES],
    [sim.events],
  );

  const actors = useMemo(() => {
    const set = new Set<string>(entries.map((e) => e.actor));
    return ["All actors", ...Array.from(set)];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (category !== "All" && e.category !== category) return false;
      if (actor !== "All actors" && e.actor !== actor) return false;
      if (
        query &&
        !`${e.id} ${e.action} ${e.target} ${e.actor}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [entries, category, actor, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const stats = useMemo(() => {
    const today = entries.filter((e) => e.date === "Today").length;
    const failed = entries.filter((e) => e.result === "Failed").length;
    const policy = entries.filter((e) => e.category === "Policy").length;
    const operator = entries.filter((e) => e.category === "Operator").length;
    return { today, failed, policy, operator };
  }, [entries]);

  return (
    <PageMotion>
      <PageHeader
        eyebrow="Activity log"
        title="Audit"
        description="Tamper-evident log of every policy action, governance vote, and operator command across the Guardian system."
        status={<StatusPill label={stagePillLabel(sim.stage)} />}
        actions={
          <>
            <Button variant="outlined" size="small">
              Download CSV
            </Button>
            <Button variant="outlined" size="small">
              Verify hash chain
            </Button>
          </>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, md: 2 },
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        <KpiCard
          label="Events today"
          value={stats.today}
          meta="Across all categories"
          Icon={IconHistory}
        />
        <KpiCard
          label="Policy actions (24h)"
          value={stats.policy}
          meta="Auto-enforced by Ika"
          Icon={IconBolt}
        />
        <KpiCard
          label="Operator actions"
          value={stats.operator}
          meta="Guardian + ops"
          Icon={IconUsers}
        />
        <KpiCard
          label="Failed attempts"
          value={stats.failed}
          meta={stats.failed ? "Review required" : "None"}
          metaTone={stats.failed ? "warning" : "success"}
          iconTone={stats.failed ? "warning" : "success"}
          Icon={IconFileText}
        />
      </Box>

      <Card>
        <CardHeader
          title="Hash-chained activity"
          description="Each entry references the prior hash"
          trailing={
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.25}
              sx={{ alignItems: { md: "center" } }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.25,
                  height: 34,
                  width: { xs: "100%", md: 260 },
                  borderRadius: 2,
                  border: `1px solid ${COLORS.border}`,
                  bgcolor: COLORS.paper,
                  color: COLORS.textSecondary,
                  transition:
                    "border-color 140ms ease, box-shadow 140ms ease",
                  "&:focus-within": {
                    borderColor: COLORS.primary,
                    boxShadow: SHADOWS.ring,
                  },
                }}
              >
                <IconSearch size={14} stroke={1.85} />
                <InputBase
                  placeholder="Search id, target, actor"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  sx={{ flex: 1, fontSize: 13, color: COLORS.textPrimary }}
                />
              </Box>
              <Select
                size="small"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as "All" | AuditCategory)
                }
                sx={{ minWidth: 140, fontSize: 13 }}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                sx={{ minWidth: 180, fontSize: 13 }}
              >
                {actors.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          }
        />

        <Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns:
                "0.75fr 1.3fr 1.6fr 1.4fr 1fr 0.8fr",
              px: 2.5,
              py: 1,
              bgcolor: COLORS.bg,
              borderBottom: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <Box>Time</Box>
            <Box>Actor</Box>
            <Box>Action</Box>
            <Box>Target</Box>
            <Box>Category</Box>
            <Box sx={{ textAlign: "right" }}>Result</Box>
          </Box>

          {filtered.length === 0 && (
            <Box sx={{ p: 2 }}>
              <EmptyState
                title="No audit entries match"
                description="Try clearing search or selecting a different category."
                Icon={IconHistory}
              />
            </Box>
          )}

          {grouped.map(([date, list]) => (
            <Box key={date}>
              <Box
                sx={{
                  px: 2.5,
                  py: 0.75,
                  bgcolor: COLORS.paper,
                  borderBottom: `1px solid ${COLORS.border}`,
                  color: COLORS.textMuted,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {date}
              </Box>
              {list.map((e) => {
                const tone = CATEGORY_TONES[e.category];
                return (
                  <Box
                    key={e.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        "0.75fr 1.3fr 1.6fr 1.4fr 1fr 0.8fr",
                      px: 2.5,
                      py: 1.5,
                      alignItems: "center",
                      borderBottom: `1px solid ${COLORS.border}`,
                      fontSize: 13,
                      transition: "background-color 140ms ease",
                      "&:hover": { bgcolor: COLORS.bg },
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <Stack spacing={0.25}>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                          color: COLORS.textPrimary,
                          fontWeight: 500,
                        }}
                      >
                        {e.time}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: COLORS.textMuted,
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, monospace",
                        }}
                      >
                        {e.id}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                      {e.actor}
                    </Typography>
                    <Typography sx={{ fontSize: 13 }}>{e.action}</Typography>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        color: COLORS.textSecondary,
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {e.target}
                    </Typography>
                    <Box>
                      <Box
                        sx={{
                          display: "inline-block",
                          px: 1,
                          py: "2px",
                          borderRadius: 999,
                          bgcolor: tone.bg,
                          color: tone.fg,
                          border: `1px solid ${tone.fg}1A`,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {e.category}
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <StatusPill
                        label={
                          e.result === "Success"
                            ? "Safe"
                            : e.result === "Pending"
                              ? "Pending"
                              : "Failed"
                        }
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Card>
    </PageMotion>
  );
}
