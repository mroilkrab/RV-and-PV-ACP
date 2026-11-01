import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart2, 
  Check, 
  Eye, 
  FileText, 
  DollarSign, 
  Percent, 
  Layers, 
  Filter, 
  ChevronRight, 
  X, 
  Printer,
  Sparkles
} from 'lucide-react';
import { Voucher } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';

interface YearlyTrendAnalysisChartProps {
  vouchers: Voucher[];
  onSelectVoucherToPrint?: (voucher: Voucher) => void;
  onSelectMonth?: (monthKey: string) => void;
}

export interface MonthlyTrendData {
  monthIndex: number; // 0 to 11
  monthNumStr: string; // '01' to '12'
  monthKey: string; // 'YYYY-MM'
  shortTh: string;
  fullTh: string;
  shortEn: string;
  // RV (Revenue) metrics
  rvTotal: number;
  rvSubtotal: number;
  rvVat: number;
  rvWht: number;
  rvCount: number;
  rvVouchers: Voucher[];
  // PV (Expense) metrics
  pvTotal: number;
  pvSubtotal: number;
  pvVat: number;
  pvWht: number;
  pvCount: number;
  pvVouchers: Voucher[];
  // Calculated comparisons
  netMargin: number; // rvTotal - pvTotal
  netRatio: number; // (netMargin / rvTotal) * 100
}

const THAI_MONTHS = [
  { short: 'ม.ค.', full: 'มกราคม', en: 'Jan' },
  { short: 'ก.พ.', full: 'กุมภาพันธ์', en: 'Feb' },
  { short: 'มี.ค.', full: 'มีนาคม', en: 'Mar' },
  { short: 'เม.ย.', full: 'เมษายน', en: 'Apr' },
  { short: 'พ.ค.', full: 'พฤษภาคม', en: 'May' },
  { short: 'มิ.ย.', full: 'มิถุนายน', en: 'Jun' },
  { short: 'ก.ค.', full: 'กรกฎาคม', en: 'Jul' },
  { short: 'ส.ค.', full: 'สิงหาคม', en: 'Aug' },
  { short: 'ก.ย.', full: 'กันยายน', en: 'Sep' },
  { short: 'ต.ค.', full: 'ตุลาคม', en: 'Oct' },
  { short: 'พ.ย.', full: 'พฤศจิกายน', en: 'Nov' },
  { short: 'ธ.ค.', full: 'ธันวาคม', en: 'Dec' },
];

function formatCompact(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}฿${(abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}฿${(abs / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}k`;
  }
  return `${sign}฿${abs.toLocaleString()}`;
}

export const YearlyTrendAnalysisChart: React.FC<YearlyTrendAnalysisChartProps> = ({
  vouchers,
  onSelectVoucherToPrint,
  onSelectMonth,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 320 });

  // Toggles for data series display
  const [showRV, setShowRV] = useState(true);
  const [showPV, setShowPV] = useState(true);
  const [showNetMargin, setShowNetMargin] = useState(true);
  const [showAreaFill, setShowAreaFill] = useState(true);

  // Interaction states
  const [hoveredData, setHoveredData] = useState<MonthlyTrendData | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectedDrilldownMonth, setSelectedDrilldownMonth] = useState<MonthlyTrendData | null>(null);

  // Determine available years from voucher data
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYear = new Date().getFullYear().toString();
    yearsSet.add(currentYear);

    vouchers.forEach((v) => {
      if (v.date && v.date.length >= 4) {
        yearsSet.add(v.date.slice(0, 4));
      }
    });

    return Array.from(yearsSet).sort().reverse();
  }, [vouchers]);

  // Selected Year state (default to 2026 if present or highest year)
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const has2026 = vouchers.some((v) => v.date && v.date.startsWith('2026'));
    if (has2026) return '2026';
    return availableYears[0] || new Date().getFullYear().toString();
  });

  // Calculate 12-month aggregated data for RV & PV
  const monthlyData = useMemo<MonthlyTrendData[]>(() => {
    const list: MonthlyTrendData[] = THAI_MONTHS.map((m, idx) => {
      const monthNumStr = (idx + 1).toString().padStart(2, '0');
      const monthKey = `${selectedYear}-${monthNumStr}`;
      return {
        monthIndex: idx,
        monthNumStr,
        monthKey,
        shortTh: m.short,
        fullTh: m.full,
        shortEn: m.en,
        rvTotal: 0,
        rvSubtotal: 0,
        rvVat: 0,
        rvWht: 0,
        rvCount: 0,
        rvVouchers: [],
        pvTotal: 0,
        pvSubtotal: 0,
        pvVat: 0,
        pvWht: 0,
        pvCount: 0,
        pvVouchers: [],
        netMargin: 0,
        netRatio: 0,
      };
    });

    vouchers.forEach((v) => {
      if (v.date && v.date.startsWith(selectedYear)) {
        const monthNum = parseInt(v.date.slice(5, 7), 10);
        if (monthNum >= 1 && monthNum <= 12) {
          const item = list[monthNum - 1];
          if (v.type === 'RV') {
            item.rvTotal += v.netPayable;
            item.rvSubtotal += v.subtotal;
            item.rvVat += v.totalVat;
            item.rvWht += v.totalWht;
            item.rvCount += 1;
            item.rvVouchers.push(v);
          } else if (v.type === 'PV') {
            item.pvTotal += v.netPayable;
            item.pvSubtotal += v.subtotal;
            item.pvVat += v.totalVat;
            item.pvWht += v.totalWht;
            item.pvCount += 1;
            item.pvVouchers.push(v);
          }
        }
      }
    });

    // Compute margins
    list.forEach((item) => {
      item.netMargin = item.rvTotal - item.pvTotal;
      item.netRatio = item.rvTotal > 0 ? (item.netMargin / item.rvTotal) * 100 : 0;
    });

    return list;
  }, [vouchers, selectedYear]);

  // Overall Annual Statistics
  const annualSummary = useMemo<{
    totalRv: number;
    totalPv: number;
    totalRvCount: number;
    totalPvCount: number;
    netProfit: number;
    profitMargin: number;
    expenseRatio: number;
    highestRvMonth: MonthlyTrendData | null;
    highestPvMonth: MonthlyTrendData | null;
  }>(() => {
    let totalRv = 0;
    let totalPv = 0;
    let totalRvCount = 0;
    let totalPvCount = 0;
    let highestRvMonth: MonthlyTrendData | null = null;
    let highestPvMonth: MonthlyTrendData | null = null;
    let maxRv = 0;
    let maxPv = 0;

    monthlyData.forEach((m) => {
      totalRv += m.rvTotal;
      totalPv += m.pvTotal;
      totalRvCount += m.rvCount;
      totalPvCount += m.pvCount;

      if (m.rvTotal > maxRv) {
        maxRv = m.rvTotal;
        highestRvMonth = m;
      }
      if (m.pvTotal > maxPv) {
        maxPv = m.pvTotal;
        highestPvMonth = m;
      }
    });

    const netProfit = totalRv - totalPv;
    const profitMargin = totalRv > 0 ? (netProfit / totalRv) * 100 : 0;
    const expenseRatio = totalRv > 0 ? (totalPv / totalRv) * 100 : 0;

    return {
      totalRv,
      totalPv,
      totalRvCount,
      totalPvCount,
      netProfit,
      profitMargin,
      expenseRatio,
      highestRvMonth,
      highestPvMonth,
    };
  }, [monthlyData]);

  // Handle ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.max(entry.contentRect.width, 320);
        const height = width < 500 ? 270 : width < 800 ? 310 : 340;
        setDimensions({ width, height });
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // D3 Multi-line Chart Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const { width, height } = dimensions;
    const isMobile = width < 500;
    const margin = {
      top: 30,
      right: isMobile ? 16 : 28,
      bottom: isMobile ? 38 : 46,
      left: isMobile ? 54 : 76,
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Defs for gradients & shadow filters
    const defs = svg.append('defs');

    // Revenue Area Gradient (Emerald)
    const rvAreaGrad = defs.append('linearGradient')
      .attr('id', 'rv-area-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    rvAreaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.35);
    rvAreaGrad.append('stop').attr('offset', '70%').attr('stop-color', '#059669').attr('stop-opacity', 0.08);
    rvAreaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#047857').attr('stop-opacity', 0.0);

    // Expense Area Gradient (Rose)
    const pvAreaGrad = defs.append('linearGradient')
      .attr('id', 'pv-area-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    pvAreaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.28);
    pvAreaGrad.append('stop').attr('offset', '70%').attr('stop-color', '#e11d48').attr('stop-opacity', 0.06);
    pvAreaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#be123c').attr('stop-opacity', 0.0);

    // Net Margin Gradient (Indigo)
    const netAreaGrad = defs.append('linearGradient')
      .attr('id', 'net-area-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    netAreaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.20);
    netAreaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#4f46e5').attr('stop-opacity', 0.0);

    // Drop shadow filter for lines
    const filter = defs.append('filter')
      .attr('id', 'line-glow')
      .attr('height', '130%');
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '2.5')
      .attr('flood-opacity', '0.22');

    // Main drawing group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scalePoint<number>()
      .domain(d3.range(12))
      .range([0, innerWidth])
      .padding(0.2);

    // Y Scale: Calculate max value among active series
    const maxVals: number[] = [];
    if (showRV) maxVals.push(...monthlyData.map((d) => d.rvTotal));
    if (showPV) maxVals.push(...monthlyData.map((d) => d.pvTotal));
    if (showNetMargin) maxVals.push(...monthlyData.map((d) => Math.max(0, d.netMargin)));

    const rawMax = maxVals.length > 0 ? d3.max(maxVals) || 100_000 : 100_000;
    const yMax = rawMax === 0 ? 50_000 : rawMax * 1.15; // 15% headroom

    const minVals: number[] = [0];
    if (showNetMargin) {
      minVals.push(...monthlyData.map((d) => d.netMargin));
    }
    const rawMin = d3.min(minVals) || 0;
    const yMin = rawMin < 0 ? rawMin * 1.15 : 0;

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0])
      .nice();

    // Horizontal Grid Lines
    const yAxisTicks = yScale.ticks(isMobile ? 4 : 6);
    g.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(yAxisTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', (d) => d === 0 ? '#94a3b8' : '#e2e8f0')
      .attr('stroke-width', (d) => d === 0 ? 1.5 : 1)
      .attr('stroke-dasharray', (d) => d === 0 ? 'none' : '3,3');

    // Y Axis Labels
    g.append('g')
      .attr('class', 'y-axis-labels')
      .selectAll('text')
      .data(yAxisTicks)
      .join('text')
      .attr('x', -10)
      .attr('y', (d) => yScale(d))
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', (d) => d === 0 ? '#475569' : '#64748b')
      .attr('font-size', isMobile ? '10px' : '11px')
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', (d) => d === 0 ? '600' : '500')
      .text((d) => formatCompact(d));

    // X Axis Labels (Months)
    g.append('g')
      .attr('class', 'x-axis-labels')
      .selectAll('text')
      .data(monthlyData)
      .join('text')
      .attr('x', (d) => xScale(d.monthIndex) || 0)
      .attr('y', innerHeight + (isMobile ? 18 : 22))
      .attr('text-anchor', 'middle')
      .attr('fill', '#475569')
      .attr('font-size', isMobile ? '10px' : '12px')
      .attr('font-family', 'var(--font-prompt, sans-serif)')
      .attr('font-weight', '500')
      .text((d) => (isMobile ? d.shortTh : `${d.shortTh}`));

    // Area and Line Generators with smooth MonotoneX curves
    const areaGeneratorRV = d3.area<MonthlyTrendData>()
      .x((d) => xScale(d.monthIndex) || 0)
      .y0(yScale(0))
      .y1((d) => yScale(d.rvTotal))
      .curve(d3.curveMonotoneX);

    const lineGeneratorRV = d3.line<MonthlyTrendData>()
      .x((d) => xScale(d.monthIndex) || 0)
      .y((d) => yScale(d.rvTotal))
      .curve(d3.curveMonotoneX);

    const areaGeneratorPV = d3.area<MonthlyTrendData>()
      .x((d) => xScale(d.monthIndex) || 0)
      .y0(yScale(0))
      .y1((d) => yScale(d.pvTotal))
      .curve(d3.curveMonotoneX);

    const lineGeneratorPV = d3.line<MonthlyTrendData>()
      .x((d) => xScale(d.monthIndex) || 0)
      .y((d) => yScale(d.pvTotal))
      .curve(d3.curveMonotoneX);

    const lineGeneratorNet = d3.line<MonthlyTrendData>()
      .x((d) => xScale(d.monthIndex) || 0)
      .y((d) => yScale(d.netMargin))
      .curve(d3.curveMonotoneX);

    // 1. Draw Area Fills (underneath)
    if (showAreaFill) {
      if (showRV) {
        g.append('path')
          .datum(monthlyData)
          .attr('class', 'rv-area')
          .attr('fill', 'url(#rv-area-gradient)')
          .attr('d', areaGeneratorRV);
      }
      if (showPV) {
        g.append('path')
          .datum(monthlyData)
          .attr('class', 'pv-area')
          .attr('fill', 'url(#pv-area-gradient)')
          .attr('d', areaGeneratorPV);
      }
    }

    // 2. Draw Net Margin Line (Indigo Dashed)
    if (showNetMargin) {
      g.append('path')
        .datum(monthlyData)
        .attr('class', 'net-line')
        .attr('fill', 'none')
        .attr('stroke', '#6366f1') // indigo-500
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,4')
        .attr('opacity', 0.85)
        .attr('d', lineGeneratorNet);
    }

    // 3. Draw PV Line (Rose Solid with shadow)
    if (showPV) {
      g.append('path')
        .datum(monthlyData)
        .attr('class', 'pv-line')
        .attr('fill', 'none')
        .attr('stroke', '#e11d48') // rose-600
        .attr('stroke-width', 2.8)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('filter', 'url(#line-glow)')
        .attr('d', lineGeneratorPV);
    }

    // 4. Draw RV Line (Emerald Solid with shadow)
    if (showRV) {
      g.append('path')
        .datum(monthlyData)
        .attr('class', 'rv-line')
        .attr('fill', 'none')
        .attr('stroke', '#059669') // emerald-600
        .attr('stroke-width', 3.2)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('filter', 'url(#line-glow)')
        .attr('d', lineGeneratorRV);
    }

    // 5. Draw Interactive Points for each Month
    const pointsGroup = g.append('g').attr('class', 'data-points');

    monthlyData.forEach((d) => {
      const cx = xScale(d.monthIndex) || 0;

      // RV Point
      if (showRV && d.rvTotal > 0) {
        pointsGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', yScale(d.rvTotal))
          .attr('r', 4.5)
          .attr('fill', '#ffffff')
          .attr('stroke', '#059669')
          .attr('stroke-width', 2.5)
          .attr('class', 'transition-all duration-150');
      }

      // PV Point
      if (showPV && d.pvTotal > 0) {
        pointsGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', yScale(d.pvTotal))
          .attr('r', 4)
          .attr('fill', '#ffffff')
          .attr('stroke', '#e11d48')
          .attr('stroke-width', 2.2)
          .attr('class', 'transition-all duration-150');
      }

      // Net Margin Point (small indigo dot)
      if (showNetMargin && (d.rvTotal > 0 || d.pvTotal > 0)) {
        pointsGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', yScale(d.netMargin))
          .attr('r', 3)
          .attr('fill', '#6366f1')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);
      }
    });

    // 6. Crosshair & Hover Overlay
    const crosshair = g.append('g')
      .attr('class', 'crosshair')
      .style('opacity', 0);

    const crosshairLine = crosshair.append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#475569')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4');

    const activeDotRV = crosshair.append('circle')
      .attr('r', 6.5)
      .attr('fill', '#059669')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5);

    const activeDotPV = crosshair.append('circle')
      .attr('r', 6.5)
      .attr('fill', '#e11d48')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5);

    // Interactive Transparent Rect for Mouse Tracking
    const overlay = g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer');

    const handlePointerMove = (event: any) => {
      const [mx, my] = d3.pointer(event);

      // Find closest month
      let closestMonth = monthlyData[0];
      let minDistance = Infinity;

      monthlyData.forEach((d) => {
        const xPos = xScale(d.monthIndex) || 0;
        const dist = Math.abs(xPos - mx);
        if (dist < minDistance) {
          minDistance = dist;
          closestMonth = d;
        }
      });

      const cx = xScale(closestMonth.monthIndex) || 0;

      // Update crosshair line position
      crosshair.style('opacity', 1);
      crosshairLine.attr('x1', cx).attr('x2', cx);

      if (showRV) {
        activeDotRV.style('display', 'block')
          .attr('cx', cx)
          .attr('cy', yScale(closestMonth.rvTotal));
      } else {
        activeDotRV.style('display', 'none');
      }

      if (showPV) {
        activeDotPV.style('display', 'block')
          .attr('cx', cx)
          .attr('cy', yScale(closestMonth.pvTotal));
      } else {
        activeDotPV.style('display', 'none');
      }

      setHoveredData(closestMonth);
      setTooltipCoords({
        x: cx + margin.left,
        y: Math.max(margin.top + 10, my + margin.top - 40),
      });
    };

    const handlePointerLeave = () => {
      crosshair.style('opacity', 0);
      setHoveredData(null);
      setTooltipCoords(null);
    };

    const handleClick = () => {
      if (hoveredData) {
        setSelectedDrilldownMonth(hoveredData);
        if (onSelectMonth) {
          onSelectMonth(hoveredData.monthKey);
        }
      }
    };

    overlay
      .on('mousemove', handlePointerMove)
      .on('mouseleave', handlePointerLeave)
      .on('click', handleClick);

  }, [dimensions, monthlyData, showRV, showPV, showNetMargin, showAreaFill]);

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-xs space-y-5">
      {/* Header Bar: Title, Year Selector & Series Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-base text-slate-900 font-prompt">
              แนวโน้มรายรับ - รายจ่ายประจำปี (Yearly RV vs. PV Trend)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            วิเคราะห์เปรียบเทียบกระแสเงินรับจากใบสำคัญรับ (RV) กับค่าใช้จ่ายใบสำคัญจ่าย (PV) ตลอด 12 เดือน ด้วย D3
          </p>
        </div>

        {/* Right Controls: Year Selector & Series Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 pr-2 py-1 outline-hidden cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  ปี พ.ศ. {parseInt(yr, 10) + 543} ({yr})
                </option>
              ))}
            </select>
          </div>

          {/* Series Visibility Toggles */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
            {/* RV Toggle */}
            <button
              type="button"
              onClick={() => setShowRV(!showRV)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                showRV 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="เปิด/ปิดเส้นรายรับ (RV)"
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>รายรับ (RV)</span>
            </button>

            {/* PV Toggle */}
            <button
              type="button"
              onClick={() => setShowPV(!showPV)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                showPV 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="เปิด/ปิดเส้นรายจ่าย (PV)"
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>รายจ่าย (PV)</span>
            </button>

            {/* Net Margin Toggle */}
            <button
              type="button"
              onClick={() => setShowNetMargin(!showNetMargin)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                showNetMargin 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="เปิด/ปิดเส้นกำไรสุทธิ (Net Margin)"
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span className="hidden sm:inline">ส่วนต่างสุทธิ</span>
              <span className="sm:hidden">สุทธิ</span>
            </button>

            {/* Area Fill Toggle */}
            <button
              type="button"
              onClick={() => setShowAreaFill(!showAreaFill)}
              className={`p-1 rounded-lg transition cursor-pointer ${
                showAreaFill ? 'text-slate-700 bg-slate-200' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="เปิด/ปิดการไล่สีใต้กราฟ (Area Fill)"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip for the Selected Year */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total RV */}
        <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-100 flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block truncate">
              รายรับสะสมทั้งปี (RV)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-emerald-900 block mt-0.5 truncate" title={`฿${formatCurrency(annualSummary.totalRv)}`}>
              ฿{formatCurrency(annualSummary.totalRv)}
            </span>
            <span className="text-[10px] text-emerald-700 block truncate">
              รวม {annualSummary.totalRvCount} ใบสำคัญรับ
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 ml-2">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>

        {/* Total PV */}
        <div className="bg-rose-50/60 rounded-xl p-3.5 border border-rose-100 flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block truncate">
              รายจ่ายสะสมทั้งปี (PV)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-rose-900 block mt-0.5 truncate" title={`฿${formatCurrency(annualSummary.totalPv)}`}>
              ฿{formatCurrency(annualSummary.totalPv)}
            </span>
            <span className="text-[10px] text-rose-700 block truncate">
              รวม {annualSummary.totalPvCount} ใบสำคัญจ่าย
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 ml-2">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100 flex items-center justify-between min-w-0">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block truncate">
              กระแสเงินสดสุทธิ (Net Flow)
            </span>
            <span className={`text-base sm:text-lg font-bold font-mono block mt-0.5 truncate ${
              annualSummary.netProfit >= 0 ? 'text-blue-900' : 'text-rose-900'
            }`} title={`฿${formatCurrency(annualSummary.netProfit)}`}>
              ฿{formatCurrency(annualSummary.netProfit)}
            </span>
            <span className="text-[10px] text-blue-700 font-medium block truncate">
              อัตรากำไรดำเนินงาน: {annualSummary.profitMargin.toFixed(1)}%
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 ml-2">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Highlight Badges */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col justify-center space-y-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] gap-1">
            <span className="text-slate-500 shrink-0">เดือนรับสูงสุด:</span>
            <span className="font-bold text-emerald-700 truncate font-mono text-right">
              {annualSummary.highestRvMonth ? `${annualSummary.highestRvMonth.shortTh} (฿${formatCompact(annualSummary.highestRvMonth.rvTotal)})` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] gap-1">
            <span className="text-slate-500 shrink-0">เดือนจ่ายสูงสุด:</span>
            <span className="font-bold text-rose-700 truncate font-mono text-right">
              {annualSummary.highestPvMonth ? `${annualSummary.highestPvMonth.shortTh} (฿${formatCompact(annualSummary.highestPvMonth.pvTotal)})` : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-0.5 border-t border-slate-200 gap-1">
            <span className="text-slate-500 shrink-0">สัดส่วนจ่าย/รับ:</span>
            <span className="font-mono font-semibold text-slate-800">
              {annualSummary.expenseRatio.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* D3 Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto overflow-visible"
        />

        {/* Floating Smart Tooltip */}
        {hoveredData && tooltipCoords && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-75 bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[240px]"
            style={{
              left: Math.min(
                Math.max(tooltipCoords.x - 120, 10),
                dimensions.width - 250
              ),
              top: Math.max(10, tooltipCoords.y - 120),
            }}
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
              <span className="font-bold font-prompt text-sm text-amber-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {hoveredData.fullTh} {parseInt(selectedYear, 10) + 543} ({hoveredData.shortEn})
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                คลิกเพื่อดูเอกสาร
              </span>
            </div>

            {/* RV Data */}
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                รายรับ (RV):
              </span>
              <div className="text-right font-mono">
                <span className="font-bold text-white">฿{formatCurrency(hoveredData.rvTotal)}</span>
                <span className="text-[10px] text-slate-400 ml-1.5">({hoveredData.rvCount} ฉบับ)</span>
              </div>
            </div>

            {/* PV Data */}
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                รายจ่าย (PV):
              </span>
              <div className="text-right font-mono">
                <span className="font-bold text-white">฿{formatCurrency(hoveredData.pvTotal)}</span>
                <span className="text-[10px] text-slate-400 ml-1.5">({hoveredData.pvCount} ฉบับ)</span>
              </div>
            </div>

            {/* Net Margin */}
            <div className="flex items-center justify-between py-1 pt-2 border-t border-slate-700/80 mt-1">
              <span className="text-slate-300 font-medium">
                กำไรดำเนินงานสุทธิ:
              </span>
              <span className={`font-mono font-bold ${
                hoveredData.netMargin >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {hoveredData.netMargin >= 0 ? '+' : ''}฿{formatCurrency(hoveredData.netMargin)}
              </span>
            </div>

            {/* Taxes summary */}
            {(hoveredData.rvWht > 0 || hoveredData.pvWht > 0) && (
              <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800 mt-1 flex items-center justify-between">
                <span>ภาษีหัก ณ ที่จ่าย 3%:</span>
                <span>หักไว้ ฿{formatCurrency(hoveredData.pvWht)} | โดนหัก ฿{formatCurrency(hoveredData.rvWht)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Footer Information & Interactive Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-600 rounded-full" />
            <span className="text-slate-700 font-medium">รายรับ (RV)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-rose-600 rounded-full" />
            <span className="text-slate-700 font-medium">รายจ่าย (PV)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 border-t-2 border-dashed border-indigo-600" />
            <span className="text-slate-700 font-medium">กำไรสุทธิ (Net Margin)</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-400">
          * คลิกที่จุดกราฟของแต่ละเดือนเพื่อเปิดดูรายละเอียดและพิมพ์เอกสาร RV / PV
        </div>
      </div>

      {/* Month Drilldown Modal */}
      {selectedDrilldownMonth && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-prompt">
                    รายละเอียดเอกสารประจำเดือน {selectedDrilldownMonth.fullTh} {parseInt(selectedYear, 10) + 543}
                  </h4>
                  <p className="text-xs text-slate-300">
                    รายการใบสำคัญรับ {selectedDrilldownMonth.rvCount} ฉบับ และใบสำคัญจ่าย {selectedDrilldownMonth.pvCount} ฉบับ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDrilldownMonth(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Month Summary Bar */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[11px] text-slate-500 block">ยอดรับ (RV)</span>
                  <span className="text-sm font-bold text-emerald-600 font-mono">
                    ฿{formatCurrency(selectedDrilldownMonth.rvTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">ยอดจ่าย (PV)</span>
                  <span className="text-sm font-bold text-rose-600 font-mono">
                    ฿{formatCurrency(selectedDrilldownMonth.pvTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">คงเหลือสุทธิ</span>
                  <span className={`text-sm font-bold font-mono ${
                    selectedDrilldownMonth.netMargin >= 0 ? 'text-blue-600' : 'text-rose-600'
                  }`}>
                    ฿{formatCurrency(selectedDrilldownMonth.netMargin)}
                  </span>
                </div>
              </div>

              {/* Vouchers List */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  รายการใบสำคัญในเดือนนี้ ({selectedDrilldownMonth.rvCount + selectedDrilldownMonth.pvCount} รายการ)
                </h5>

                {[...selectedDrilldownMonth.rvVouchers, ...selectedDrilldownMonth.pvVouchers].length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl">
                    ไม่มีรายการเอกสารในเดือนนี้
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {[...selectedDrilldownMonth.rvVouchers, ...selectedDrilldownMonth.pvVouchers].map((v) => (
                      <div key={v.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                            v.type === 'RV' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {v.voucherNo}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-800 block">{v.contact.name}</span>
                            <span className="text-[11px] text-slate-500 truncate max-w-xs block">
                              {v.items[0]?.description || 'ไม่มีรายละเอียด'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right font-mono">
                            <span className="font-bold text-slate-900 block">฿{formatCurrency(v.netPayable)}</span>
                            <span className="text-[10px] text-slate-400 block">{v.date}</span>
                          </div>
                          {onSelectVoucherToPrint && (
                            <button
                              onClick={() => {
                                setSelectedDrilldownMonth(null);
                                onSelectVoucherToPrint(v);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="พิมพ์แบบฟอร์ม A4"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setSelectedDrilldownMonth(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
