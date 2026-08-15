import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import {
  FaArrowLeft,
  FaCircleQuestion,
  FaCloudSun,
  FaMagnifyingGlassMinus,
} from "react-icons/fa6";

export default function SampleDashboard1({ chartConfigs = [] }) {
  const chartsRef = useRef([]);
  const intervalRef = useRef(null);
  const clickHandlerRef = useRef(null);

  useEffect(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const d = new Date();
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      const clockEl = document.getElementById("clock");
      const dateEl = document.getElementById("dateLine");
      if (clockEl) clockEl.textContent = `${hh}:${mm}:${ss}`;
      if (dateEl) {
        const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
        const month = d.toLocaleDateString(undefined, { month: "short" });
        const day = d.getDate();
        const year = d.getFullYear();
        dateEl.textContent = `${weekday}, ${month} ${day}, ${year}`;
      }
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    const tempEl = document.getElementById("temp");
    if (tempEl) tempEl.textContent = "--°C";

    const destroyAll = () => {
      while (chartsRef.current.length) {
        const c = chartsRef.current.pop();
        try {
          c.destroy();
        } catch (e) {
          // ignore
        }
      }
    };

    const buildCharts = (processName) => {
      const gridColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--line")
        .trim();
      const muted = getComputedStyle(document.documentElement)
        .getPropertyValue("--muted")
        .trim();

      Chart.defaults.font.family =
        "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial";
      Chart.defaults.color = muted;

      const setT = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };
      setT("blockTitle", `Processwise Status — ${processName}`);
      setT("c1Title", `${processName} — Trend (Line)`);
      setT("c2Title", `${processName} — Status Mix (Doughnut)`);
      setT("c3Title", `${processName} — CTR vs Clicks (Horizontal Bar)`);
      setT("c4Title", `${processName} — Target vs Actual (Radar)`);
      setT("c5Title", `${processName} — Monthly Volume (Bar)`);
      setT("c6Title", `${processName} — Stages (Polar Area)`);
      setT("c7Title", `${processName} — SLA % Gauge (Doughnut)`);
      setT("c8Title", `${processName} — Risk vs Impact (Bubble)`);
      setT("c9Title", `${processName} — Lead Time Distribution (Scatter)`);
      setT("c10Title", `${processName} — Resource Split (Pie)`);
      setT("c11Title", `${processName} — Weekly Completion (Area)`);
      setT("c12Title", `${processName} — Open vs Closed (Stacked Bar)`);

      const getCtx = (id) => document.getElementById(id);
      const seed = Array.from(processName).reduce((a, ch) => a + ch.charCodeAt(0), 0);
      const wobble = (i, base, amp) => base + Math.sin((seed + i) * 0.65) * amp;

      const resolveDynamic = (index, fallbackType, fallbackOptions) => {
        const cfg = chartConfigs[index];
        if (!cfg || !Array.isArray(cfg.labels) || !Array.isArray(cfg.values) || !cfg.labels.length) {
          return null;
        }
        const typeMap = {
          Bar: "bar",
          "H. Bar": "bar",
          Pie: "pie",
          Doughnut: "doughnut",
          Line: "line",
        };
        const chartType = typeMap[cfg.chartType] || fallbackType;
        const baseOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "top", align: "start" } },
        };
        const opts = { ...baseOptions };
        if (chartType === "bar" || chartType === "line") {
          opts.scales = {
            x: { grid: { display: chartType === "line" ? false : true, color: gridColor } },
            y: { grid: { color: gridColor } },
          };
        }
        if (cfg.chartType === "H. Bar") {
          opts.indexAxis = "y";
        }
        if (chartType === "doughnut") {
          opts.cutout = "68%";
        }
        return {
          type: chartType,
          data: {
            labels: cfg.labels,
            datasets: [
              {
                label: cfg.tableName || "Dataset",
                data: cfg.values,
                borderWidth: chartType === "line" ? 2 : 0,
                pointRadius: chartType === "line" ? 0 : undefined,
                tension: chartType === "line" ? 0.35 : undefined,
                borderRadius: chartType === "bar" ? 10 : undefined,
              },
            ],
          },
          options: opts,
        };
      };

      const c1Fallback = {
        type: "line",
        data: {
          labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
          datasets: [
            {
              label: "Throughput",
              data: [1, 2, 3, 4, 5, 6, 7].map((i) =>
                Math.round(wobble(i, 50, 12))
              ),
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.35,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor } },
          },
        },
      };
      chartsRef.current.push(
        new Chart(
          getCtx("c1"),
          resolveDynamic(0, c1Fallback.type, c1Fallback.options) || c1Fallback
        )
      );

      const c2Fallback = {
        type: "doughnut",
        data: {
          labels: ["Open", "In Progress", "Closed"],
          datasets: [
            {
              data: [
                Math.max(5, Math.round(wobble(1, 34, 10))),
                Math.max(5, Math.round(wobble(2, 28, 8))),
                Math.max(5, Math.round(wobble(3, 38, 10))),
              ],
              borderWidth: 0,
              cutout: "68%",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "top", align: "start" } },
        },
      };
      chartsRef.current.push(
        new Chart(
          getCtx("c2"),
          resolveDynamic(1, c2Fallback.type, c2Fallback.options) || c2Fallback
        )
      );

      const c3Fallback = {
        type: "bar",
        data: {
          labels: ["Instagram", "Facebook", "Pinterest"],
          datasets: [
            {
              label: "CTR",
              data: [
                +wobble(1, 1.42, 0.15).toFixed(2),
                +wobble(2, 1.29, 0.12).toFixed(2),
                +wobble(3, 0.99, 0.1).toFixed(2),
              ],
              borderWidth: 0,
              borderRadius: 10,
            },
            {
              label: "Clicks (K)",
              data: [
                +wobble(4, 68.61, 12).toFixed(2),
                +wobble(5, 69.97, 10).toFixed(2),
                +wobble(6, 43.01, 8).toFixed(2),
              ],
              borderWidth: 0,
              borderRadius: 10,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: "y",
          plugins: { legend: { position: "top", align: "start" } },
          scales: {
            x: { grid: { color: gridColor } },
            y: { grid: { display: false } },
          },
        },
      };
      chartsRef.current.push(
        new Chart(
          getCtx("c3"),
          resolveDynamic(2, c3Fallback.type, c3Fallback.options) || c3Fallback
        )
      );

      chartsRef.current.push(
        new Chart(getCtx("c4"), {
          type: "radar",
          data: {
            labels: ["Quality", "Speed", "Compliance", "Cost", "Satisfaction"],
            datasets: [
              {
                label: "Target",
                data: [80, 75, 90, 70, 85].map((v, i) =>
                  Math.round(wobble(i + 1, v, 4))
                ),
                borderWidth: 2,
                pointRadius: 0,
              },
              {
                label: "Actual",
                data: [72, 68, 85, 62, 78].map((v, i) =>
                  Math.round(wobble(i + 8, v, 6))
                ),
                borderWidth: 2,
                pointRadius: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top", align: "start" } },
            scales: { r: { grid: { color: gridColor }, angleLines: { color: gridColor } } },
          },
        })
      );

      chartsRef.current.push(
        new Chart(getCtx("c5"), {
          type: "bar",
          data: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            datasets: [
              {
                label: "Volume",
                data: [1, 2, 3, 4, 5, 6].map((i) =>
                  Math.round(wobble(i + 2, 120, 35))
                ),
                borderWidth: 0,
                borderRadius: 10,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { grid: { color: gridColor } },
            },
          },
        })
      );

      chartsRef.current.push(
        new Chart(getCtx("c6"), {
          type: "polarArea",
          data: {
            labels: ["Initiated", "Reviewed", "Approved", "Rejected", "Closed"],
            datasets: [
              {
                data: [1, 2, 3, 4, 5].map((i) =>
                  Math.round(wobble(i + 10, 18, 9))
                ),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top", align: "start" } },
            scales: { r: { grid: { color: gridColor }, angleLines: { color: gridColor } } },
          },
        })
      );

      const sla = Math.max(35, Math.min(98, Math.round(wobble(13, 82, 12))));
      chartsRef.current.push(
        new Chart(getCtx("c7"), {
          type: "doughnut",
          data: {
            labels: ["Met", "Remaining"],
            datasets: [{ data: [sla, 100 - sla], borderWidth: 0, cutout: "75%" }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
          },
          plugins: [
            {
              id: "centerText",
              afterDraw(chart) {
                const { ctx } = chart;
                const meta = chart.getDatasetMeta(0);
                if (!meta?.data?.length) return;
                const x = meta.data[0].x;
                const y = meta.data[0].y;
                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#111827";
                ctx.font = "900 18px Inter";
                ctx.fillText(`${sla}%`, x, y);
                ctx.fillStyle = muted;
                ctx.font = "700 12px Inter";
                ctx.fillText("SLA", x, y + 18);
                ctx.restore();
              },
            },
          ],
        })
      );

      chartsRef.current.push(
        new Chart(getCtx("c8"), {
          type: "bubble",
          data: {
            datasets: [
              {
                label: "Items",
                data: [
                  { x: 2, y: 3, r: 10 },
                  { x: 3, y: 7, r: 14 },
                  { x: 6, y: 4, r: 12 },
                  { x: 7, y: 8, r: 16 },
                ].map((p, i) => ({
                  x: p.x,
                  y: p.y,
                  r: Math.max(8, Math.round(wobble(i + 20, p.r, 3))),
                })),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                title: { display: true, text: "Risk" },
                grid: { color: gridColor },
                suggestedMin: 0,
                suggestedMax: 10,
              },
              y: {
                title: { display: true, text: "Impact" },
                grid: { color: gridColor },
                suggestedMin: 0,
                suggestedMax: 10,
              },
            },
          },
        })
      );

      chartsRef.current.push(
        new Chart(getCtx("c9"), {
          type: "scatter",
          data: {
            datasets: [
              {
                label: "Lead time (days)",
                data: Array.from({ length: 14 }).map((_, i) => ({
                  x: i + 1,
                  y: Math.round(wobble(i + 30, 18, 7)),
                })),
                borderWidth: 1,
                pointRadius: 3,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: gridColor }, title: { display: true, text: "Case #" } },
              y: { grid: { color: gridColor }, title: { display: true, text: "Days" } },
            },
          },
        })
      );

      chartsRef.current.push(
        new Chart(getCtx("c10"), {
          type: "pie",
          data: {
            labels: ["Team A", "Team B", "Team C"],
            datasets: [
              {
                data: [
                  Math.round(wobble(40, 42, 9)),
                  Math.round(wobble(41, 33, 8)),
                  Math.round(wobble(42, 25, 7)),
                ],
                borderWidth: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top", align: "start" } },
          },
        })
      );

      chartsRef.current.push(
        new Chart(getCtx("c11"), {
          type: "line",
          data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [
              {
                label: "Completed",
                data: [1, 2, 3, 4, 5, 6, 7].map((i) =>
                  Math.round(wobble(i + 50, 30, 10))
                ),
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.35,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { grid: { color: gridColor } },
            },
          },
        })
      );

      chartsRef.current.push(
        new Chart(getCtx("c12"), {
          type: "bar",
          data: {
            labels: ["W1", "W2", "W3", "W4", "W5"],
            datasets: [
              {
                label: "Open",
                data: [1, 2, 3, 4, 5].map((i) =>
                  Math.round(wobble(i + 60, 22, 8))
                ),
                borderWidth: 0,
                borderRadius: 8,
              },
              {
                label: "Closed",
                data: [1, 2, 3, 4, 5].map((i) =>
                  Math.round(wobble(i + 70, 18, 7))
                ),
                borderWidth: 0,
                borderRadius: 8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "top", align: "start" } },
            scales: {
              x: { stacked: true, grid: { display: false } },
              y: { stacked: true, grid: { color: gridColor } },
            },
          },
        })
      );
    };

    destroyAll();
    buildCharts("ESR");

    const btnWrap = document.getElementById("processButtons");
    const onClick = (e) => {
      const btn = e.target.closest(".navbtn");
      if (!btn) return;
      document.querySelectorAll(".navbtn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const process = btn.getAttribute("data-process") || btn.textContent.trim();
      destroyAll();
      buildCharts(process);
    };
    clickHandlerRef.current = onClick;
    if (btnWrap) btnWrap.addEventListener("click", onClick);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (btnWrap && clickHandlerRef.current) {
        btnWrap.removeEventListener("click", clickHandlerRef.current);
      }
      destroyAll();
    };
  }, []);

  return (
    <div className="app">
      <style>{`
        :root{
          --bg:#f4f6f9;
          --card:#ffffff;
          --text:#111827;
          --muted:#6b7280;
          --line:#d1d5db;
          --soft:#eef2f7;
          --shadow:0 10px 24px rgba(17,24,39,.08);
          --sidebarW: 320px;
          --brand:#0b5cab;
          --brand2:#1e88e5;
          --btnBorder:#bdbdbd;
        }
        *{box-sizing:border-box}
        html,body,#root{height:100%}
        body{
          margin:0;
          font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial;
          background:var(--bg);
          color:var(--text);
        }
        .app{
          min-height:100vh;
          width:100vw;
          display:grid;
          grid-template-columns: var(--sidebarW) 1fr;
        }
        .left{
          background:#fff;
          border-right:1px solid var(--line);
          padding:18px 18px 20px;
        }
        .left h1{
          font-size:18px;
          margin:0 0 12px 0;
          font-weight:800;
        }
        .left .sub{
          color:var(--muted);
          font-size:13px;
          margin-bottom:12px;
        }
        .statusCard{
          border:1px solid var(--line);
          border-radius:12px;
          padding:14px;
          background:linear-gradient(180deg,#fff,#fafbff);
          box-shadow:var(--shadow);
        }
        .statusCard .label{
          font-size:12px;
          color:var(--muted);
          margin-bottom:10px;
        }
        .statusCard .time{
          font-size:30px;
          font-weight:900;
          letter-spacing:.2px;
          margin:0;
        }
        .statusCard .date{
          margin-top:6px;
          color:var(--muted);
          font-size:13px;
          border-bottom:1px solid var(--soft);
          padding-bottom:10px;
        }
        .weather{
          display:flex;
          gap:10px;
          align-items:center;
          padding-top:10px;
          color:var(--muted);
          font-size:12px;
          font-weight:600;
          text-transform:uppercase;
        }
        .weather svg{font-size:18px; color:#f59e0b}
        .sectionTitle{
          margin:16px 0 10px;
          font-weight:800;
          font-size:13px;
          color:#374151;
        }
        .btnList{
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .navbtn{
          width:100%;
          border:1px solid var(--btnBorder);
          background:#fff;
          border-radius:8px;
          padding:12px 10px;
          font-weight:800;
          text-align:center;
          cursor:pointer;
          user-select:none;
          box-shadow:0 1px 0 rgba(0,0,0,.02);
        }
        .navbtn:hover{background:#fafafa}
        .navbtn.active{
          outline:3px solid rgba(30,136,229,.15);
          border-color:#8ab9ea;
        }
        .main{
          display:flex;
          flex-direction:column;
          min-width:0;
        }
        .topHeader{
          background:#fff;
          border-bottom:1px solid var(--line);
          padding:22px 22px 14px;
        }
        .topHeader h2{
          margin:0;
          font-size:22px;
          font-weight:900;
        }
        .topHeader .hint{
          margin-top:4px;
          color:var(--muted);
          font-size:14px;
          font-weight:600;
        }
        .content{
          padding:18px 22px 22px;
          min-width:0;
        }
        .block{
          background:#fff;
          border:1px solid var(--line);
          border-radius:10px;
          box-shadow:var(--shadow);
          padding:14px;
        }
        .blockTitle{
          font-weight:900;
          font-size:18px;
          color:var(--brand);
          margin:0 0 10px 0;
        }
        .chartGrid{
          border:1px solid var(--line);
          border-radius:10px;
          background:#fafafa;
          padding:14px;
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap:14px;
          min-width:0;
        }
        .chartCard{
          background:#fff;
          border:1px solid var(--line);
          border-radius:12px;
          padding:12px;
          box-shadow:0 6px 14px rgba(17,24,39,.06);
          min-width:0;
          overflow:hidden;
        }
        .chartHead{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:8px;
        }
        .chartName{
          font-weight:900;
          font-size:13px;
          margin:0;
          line-height:1.2;
        }
        .chartTools{
          color:#9ca3af;
          font-size:12px;
          display:flex;
          gap:10px;
          align-items:center;
          user-select:none;
        }
        .chartTools svg{opacity:.85}
        .chartWrap{
          height:170px;
          position:relative;
        }
        .chartWrap.tall{height:190px;}
        @media (max-width: 1500px){
          .chartGrid{grid-template-columns: repeat(3, minmax(0,1fr));}
        }
        @media (max-width: 1180px){
          .app{grid-template-columns: 280px 1fr;}
          .chartGrid{grid-template-columns: repeat(2, minmax(0,1fr));}
        }
        @media (max-width: 860px){
          .app{grid-template-columns: 1fr;}
          .left{border-right:0; border-bottom:1px solid var(--line);}
          .chartGrid{grid-template-columns: 1fr;}
        }
      `}</style>

      <aside className="left">
        <h1>Techtango Business Intelligence</h1>
        {/* <div className="sub">Local Status</div> */}

        {/* <div className="statusCard">
          <div className="label">Time</div>
          <p className="time" id="clock">--:--:--</p>
          <div className="date" id="dateLine">—</div>
          <div className="weather">
            <FaCloudSun />
            <div>
              <span id="temp">--°C</span> &nbsp; DETECTING WEATHER…
            </div>
          </div>
        </div> */}

        <div className="sectionTitle">Business Processes</div>
        <div className="btnList" id="processButtons">
          <button className="navbtn active" data-process="ESR">ESR</button>
          <button className="navbtn" data-process="ESR Under Evaluation">ESR Under Evaluation</button>
          <button className="navbtn" data-process="LUP">LUP</button>
          <button className="navbtn" data-process="GES">GES</button>
          <button className="navbtn" data-process="KPI">KPI</button>
          <button className="navbtn" data-process="MOC">MOC</button>
          <button className="navbtn" data-process="Active Contracts">Active Contracts</button>
          <button className="navbtn" data-process="Contract Manpower">Contract Manpower</button>
          <button className="navbtn" data-process="70% Value Consumed">70% Value Consumed</button>
          <button className="navbtn" data-process="Expiry less than 2 years">Expiry less than 2 years</button>
          <button className="navbtn" data-process="SW / EWO Contracts">SW / EWO Contracts</button>
        </div>
      </aside>

      <main className="main">
        {/* <header className="topHeader">
          <h2>Manager&apos;s Dashboard</h2>
          <div className="hint">Monitor ESD Process</div>
        </header> */}

        <section className="content">
          <div className="block">
            <h3 className="blockTitle" id="blockTitle">Sample Dashboard 1</h3>
            <div className="chartGrid">
              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c1Title">ESR — Trend (Line)</p>
                  <div className="chartTools">
                    <FaArrowLeft /> Back
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c1" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c2Title">ESR — Status Mix (Doughnut)</p>
                  <div className="chartTools">
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c2" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c3Title">ESR — CTR vs Clicks (Horizontal Bar)</p>
                  <div className="chartTools">
                    <FaArrowLeft /> Back
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c3" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c4Title">ESR — Target vs Actual (Radar)</p>
                  <div className="chartTools">
                    <FaCircleQuestion />
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c4" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c5Title">ESR — Monthly Volume (Bar)</p>
                  <div className="chartTools">
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c5" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c6Title">ESR — Stages (Polar Area)</p>
                  <div className="chartTools">
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c6" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c7Title">ESR — SLA % Gauge (Doughnut)</p>
                  <div className="chartTools">
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c7" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c8Title">ESR — Risk vs Impact (Bubble)</p>
                  <div className="chartTools">
                    <FaCircleQuestion />
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c8" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c9Title">ESR — Lead Time Distribution (Scatter)</p>
                  <div className="chartTools">
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c9" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c10Title">ESR — Resource Split (Pie)</p>
                  <div className="chartTools">
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c10" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c11Title">ESR — Weekly Completion (Area)</p>
                  <div className="chartTools">
                    <FaArrowLeft /> Back
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c11" />
                </div>
              </div>

              <div className="chartCard">
                <div className="chartHead">
                  <p className="chartName" id="c12Title">ESR — Open vs Closed (Stacked Bar)</p>
                  <div className="chartTools">
                    <FaMagnifyingGlassMinus /> Zoom-out
                  </div>
                </div>
                <div className="chartWrap">
                  <canvas id="c12" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
