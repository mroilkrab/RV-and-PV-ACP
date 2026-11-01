import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { 
  TrendingUp, 
  Calendar, 
  ArrowDownLeft, 
  Award, 
  BarChart3, 
  FileText,
  Info,
  ChevronRight
} from 'lucide-react';
import { Voucher } from '../types';
import { formatCurrency } from '../utils/thaiBahtText';

interface RvMonthlyRevenueChartProps {
  vouchers: Voucher[];
  onSelectMonth?: (monthKey: string) => void;
  onSelectVoucherToPrint?: (voucher: Voucher) => void;
}

interface MonthRevenueData {
  monthIndex: number; // 0-11
  monthNumStr: string; // '01', '02', ...
  monthKey: string; // 'YYYY-MM'
  shortTh: string; // 'ม.ค.', 'ก.พ.', ...
  fullTh: string; // 'มกราคม', 'กุมภาพันธ์', ...
  shortEn: string; // 'Jan', 'Feb', ...
  revenue: number; // sum of netPayable
  subtotal: number; // sum of subtotal before tax
  vat: number; // sum of VAT
  wht: number; // sum of WHT (withheld by customer)
  count: number; // number of RV vouchers
  vouchers: Voucher[];
}

const THAI_MONTH_NAMES = [
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

function formatCompactBaht(val: number): string {
  if (val >= 1_000_000) {
    return `฿${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (val >= 1_000) {
    return `฿${(val / 1_000).toFixed(val % 1_000 === 0 ? 0 : 1)}k`;
  }
  return `฿${val.toLocaleString()}`;
}

export const RvMonthlyRevenueChart: React.FC<RvMonthlyRevenueChartProps> = ({
  vouchers,
  onSelectMonth,
  onSelectVoucherToPrint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 280 });
  const [hoveredMonth, setHoveredMonth] = useState<MonthRevenueData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; barX: number } | null>(null);
  const [selectedMonthModal, setSelectedMonthModal] = useState<MonthRevenueData | null>(null);

  // Available years from vouchers (defaults to current year or years found in RVs)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYearStr = new Date().getFullYear().toString();
    yearsSet.add(currentYearStr);

    vouchers.forEach((v) => {
      if (v.date && v.date.length >= 4) {
        yearsSet.add(v.date.slice(0, 4));
      }
    });

    return Array.from(yearsSet).sort().reverse();
  }, [vouchers]);

  // Selected Year state (defaults to 2026 if present or current year)
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const has2026 = vouchers.some((v) => v.date && v.date.startsWith('2026'));
    if (has2026) return '2026';
    return new Date().getFullYear().toString();
  });

  // Calculate 12-month data for selected year
  const monthlyRevenueData = useMemo<MonthRevenueData[]>(() => {
    const monthsData: MonthRevenueData[] = THAI_MONTH_NAMES.map((m, idx) => {
      const monthNumStr = (idx + 1).toString().padStart(2, '0');
      const monthKey = `${selectedYear}-${monthNumStr}`;
      return {
        monthIndex: idx,
        monthNumStr,
        monthKey,
        shortTh: m.short,
        fullTh: m.full,
        shortEn: m.en,
        revenue: 0,
        subtotal: 0,
        vat: 0,
        wht: 0,
        count: 0,
        vouchers: [],
      };
    });

    // Populate with RV vouchers
    vouchers.forEach((v) => {
      if (v.type === 'RV' && v.date && v.date.startsWith(selectedYear)) {
        const monthPart = parseInt(v.date.slice(5, 7), 10); // 1-12
        if (monthPart >= 1 && monthPart <= 12) {
          const target = monthsData[monthPart - 1];
          target.revenue += v.netPayable;
          target.subtotal += v.subtotal;
          target.vat += v.totalVat;
          target.wht += v.totalWht;
          target.count += 1;
          target.vouchers.push(v);
        }
      }
    });

    return monthsData;
  }, [vouchers, selectedYear]);

  // Annual statistics for RV
  const annualStats = useMemo<{
    totalRevenue: number;
    totalSubtotal: number;
    totalVouchers: number;
    activeMonthsCount: number;
    bestMonth: MonthRevenueData | null;
    averageMonthly: number;
  }>(() => {
    let totalRevenue = 0;
    let totalSubtotal = 0;
    let totalVouchers = 0;
    let activeMonthsCount = 0;
    let maxRevenue = 0;
    let bestMonthFound: MonthRevenueData | null = null;

    for (const m of monthlyRevenueData) {
      totalRevenue += m.revenue;
      totalSubtotal += m.subtotal;
      totalVouchers += m.count;
      if (m.count > 0) {
        activeMonthsCount += 1;
      }
      if (m.revenue > maxRevenue) {
        maxRevenue = m.revenue;
        bestMonthFound = m;
      }
    }

    const averageMonthly = activeMonthsCount > 0 ? totalRevenue / 12 : 0;

    return {
      totalRevenue,
      totalSubtotal,
      totalVouchers,
      activeMonthsCount,
      bestMonth: bestMonthFound,
      averageMonthly,
    };
  }, [monthlyRevenueData]);

  // ResizeObserver on the container element
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.max(entry.contentRect.width, 320);
        // Adaptive height based on width
        const height = width < 500 ? 250 : 290;
        setDimensions({ width, height });
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // D3 Chart Rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const { width, height } = dimensions;
    const isMobile = width < 500;
    const margin = { 
      top: 25, 
      right: isMobile ? 12 : 20, 
      bottom: isMobile ? 35 : 45, 
      left: isMobile ? 50 : 68 
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Define gradients and filters in defs
    const defs = svg.append('defs');

    // Normal bar gradient (emerald)
    const normalGradient = defs.append('linearGradient')
      .attr('id', 'rv-bar-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    normalGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981'); // emerald-500

    normalGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#047857'); // emerald-700

    // Hovered bar gradient (richer emerald with glow)
    const hoverGradient = defs.append('linearGradient')
      .attr('id', 'rv-bar-hover-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    hoverGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#34d399'); // emerald-400

    hoverGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#065f46'); // emerald-800

    // Zero-value bar gradient (neutral subtle)
    const emptyGradient = defs.append('linearGradient')
      .attr('id', 'rv-bar-empty-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    emptyGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#e2e8f0');

    emptyGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#cbd5e1');

    // Root Group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const maxVal = d3.max(monthlyRevenueData, (d) => d.revenue) || 0;
    const yDomainMax = maxVal > 0 ? maxVal * 1.18 : 100000;

    const xScale = d3.scaleBand<string>()
      .domain(monthlyRevenueData.map((d) => d.shortTh))
      .range([0, innerWidth])
      .padding(isMobile ? 0.22 : 0.32);

    const yScale = d3.scaleLinear()
      .domain([0, yDomainMax])
      .nice()
      .range([innerHeight, 0]);

    // Horizontal Grid Lines
    const yTicks = isMobile ? 4 : 5;
    const yAxisGrid = d3.axisLeft(yScale)
      .ticks(yTicks)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid-lines')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#f1f5f9')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 1);

    g.select('.grid-lines .domain').remove();

    // Y Axis (Values in Thai Baht)
    const yAxis = d3.axisLeft(yScale)
      .ticks(yTicks)
      .tickFormat((d) => formatCompactBaht(d as number));

    const yAxisGroup = g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('.tick line').remove();
    yAxisGroup.selectAll('.tick text')
      .attr('font-size', isMobile ? '10px' : '11px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
      .attr('fill', '#64748b')
      .attr('dx', '-4');

    // X Axis (Months)
    const xAxis = d3.axisBottom(xScale);

    const xAxisGroup = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain')
      .attr('stroke', '#e2e8f0')
      .attr('stroke-width', 1);

    xAxisGroup.selectAll('.tick line').remove();
    xAxisGroup.selectAll('.tick text')
      .attr('font-size', isMobile ? '10px' : '11px')
      .attr('font-weight', '500')
      .attr('font-family', 'Prompt, sans-serif')
      .attr('fill', '#475569')
      .attr('dy', '10');

    // Bars Container
    const barGroups = g.selectAll('.bar-group')
      .data(monthlyRevenueData)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('cursor', 'pointer');

    const barWidth = xScale.bandwidth();

    // Subtle background column track for easy click/hover targeting
    barGroups.append('rect')
      .attr('class', 'bar-track')
      .attr('x', (d) => xScale(d.shortTh) || 0)
      .attr('y', 0)
      .attr('width', barWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('rx', 4);

    // Actual revenue bar
    const bars = barGroups.append('rect')
      .attr('class', 'rv-bar')
      .attr('x', (d) => xScale(d.shortTh) || 0)
      .attr('width', barWidth)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('y', innerHeight) // start from bottom for entrance transition
      .attr('height', 0)
      .attr('fill', (d) => (d.revenue > 0 ? 'url(#rv-bar-gradient)' : 'url(#rv-bar-empty-gradient)'))
      .attr('opacity', (d) => (d.revenue > 0 ? 0.92 : 0.35));

    // Animate bars entering smoothly
    bars.transition()
      .duration(750)
      .delay((_, i) => i * 35)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => {
        if (d.revenue === 0) return innerHeight - 4; // slight 4px stub
        return yScale(d.revenue);
      })
      .attr('height', (d) => {
        if (d.revenue === 0) return 4;
        return innerHeight - yScale(d.revenue);
      });

    // Value Labels on top of non-zero bars
    barGroups.filter((d) => d.revenue > 0)
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (d) => (xScale(d.shortTh) || 0) + barWidth / 2)
      .attr('y', (d) => yScale(d.revenue) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', isMobile ? '9px' : '10px')
      .attr('font-weight', '600')
      .attr('font-family', 'ui-monospace, SFMono-Regular, monospace')
      .attr('fill', '#047857')
      .attr('opacity', 0)
      .text((d) => formatCompactBaht(d.revenue))
      .transition()
      .duration(600)
      .delay((_, i) => 250 + i * 35)
      .attr('opacity', 1);

    // Interactive Hover and Click Events
    barGroups
      .on('mouseenter', function (event, d) {
        d3.select(this).select('.rv-bar')
          .transition()
          .duration(150)
          .attr('fill', d.revenue > 0 ? 'url(#rv-bar-hover-gradient)' : '#cbd5e1')
          .attr('opacity', 1)
          .attr('transform', 'scale(1, 1.02)')
          .attr('transform-origin', `${(xScale(d.shortTh) || 0) + barWidth / 2}px ${innerHeight}px`);

        d3.select(this).select('.bar-track')
          .attr('fill', 'rgba(240, 253, 244, 0.5)'); // light emerald tint track

        const [pointerX, pointerY] = d3.pointer(event, containerRef.current);
        const barCenterX = margin.left + (xScale(d.shortTh) || 0) + barWidth / 2;

        setHoveredMonth(d);
        setTooltipPos({
          x: pointerX,
          y: pointerY,
          barX: barCenterX,
        });
      })
      .on('mousemove', function (event, d) {
        const [pointerX, pointerY] = d3.pointer(event, containerRef.current);
        const barCenterX = margin.left + (xScale(d.shortTh) || 0) + barWidth / 2;

        setHoveredMonth(d);
        setTooltipPos({
          x: pointerX,
          y: pointerY,
          barX: barCenterX,
        });
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).select('.rv-bar')
          .transition()
          .duration(200)
          .attr('fill', d.revenue > 0 ? 'url(#rv-bar-gradient)' : 'url(#rv-bar-empty-gradient)')
          .attr('opacity', d.revenue > 0 ? 0.92 : 0.35)
          .attr('transform', 'scale(1, 1)');

        d3.select(this).select('.bar-track')
          .attr('fill', 'transparent');

        setHoveredMonth(null);
        setTooltipPos(null);
      })
      .on('click', (_, d) => {
        if (d.vouchers.length > 0) {
          setSelectedMonthModal(d);
        } else if (onSelectMonth) {
          onSelectMonth(d.monthKey);
        }
      });

  }, [monthlyRevenueData, dimensions, onSelectMonth]);

  const thaiYear = parseInt(selectedYear, 10) + 543;

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 transition hover:shadow-sm space-y-6">
      {/* Header with Title and Year Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-prompt">
                ภาพรวมรายได้ใบสำคัญรับ (RV) ประจำปี
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                D3 Chart
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              แผนภูมิแท่งแสดงยอดเงินรับสุทธิ (Net Revenue) แยกรายเดือน 12 เดือน เพื่อวิเคราะห์ผลประกอบการ
            </p>
          </div>
        </div>

        {/* Year Selector Control */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
          <span className="text-xs font-semibold text-slate-600">ปีภาษี:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="py-1 px-2.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {availableYears.map((yr) => {
              const thYr = parseInt(yr, 10) + 543;
              return (
                <option key={yr} value={yr}>
                  {yr} (พ.ศ. {thYr})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* KPI Performance Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
        <div>
          <span className="text-[11px] font-semibold text-emerald-800/80 uppercase tracking-wider block">
            รายได้ RV รวมทั้งปี ({selectedYear})
          </span>
          <div className="text-xl font-bold font-mono text-emerald-950 mt-1">
            ฿{formatCurrency(annualStats.totalRevenue)}
          </div>
          <div className="text-[10px] text-emerald-700/80 mt-0.5">
            ก่อนภาษี: ฿{formatCurrency(annualStats.totalSubtotal)}
          </div>
        </div>

        <div className="border-l border-emerald-200/60 pl-3">
          <span className="text-[11px] font-semibold text-emerald-800/80 uppercase tracking-wider block">
            เดือนที่รายได้สูงสุด
          </span>
          <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1">
            {annualStats.bestMonth ? (
              <>
                <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="truncate">{annualStats.bestMonth.fullTh}</span>
              </>
            ) : (
              <span className="text-slate-400 font-normal">-</span>
            )}
          </div>
          <div className="text-[11px] font-mono font-semibold text-emerald-700 mt-0.5">
            {annualStats.bestMonth ? `฿${formatCurrency(annualStats.bestMonth.revenue)}` : '-'}
          </div>
        </div>

        <div className="border-l border-emerald-200/60 pl-3">
          <span className="text-[11px] font-semibold text-emerald-800/80 uppercase tracking-wider block">
            รายได้เฉลี่ยต่อเดือน
          </span>
          <div className="text-lg font-bold font-mono text-slate-900 mt-1">
            ฿{formatCurrency(annualStats.averageMonthly)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            เฉลี่ย 12 เดือนในปี {thaiYear}
          </div>
        </div>

        <div className="border-l border-emerald-200/60 pl-3">
          <span className="text-[11px] font-semibold text-emerald-800/80 uppercase tracking-wider block">
            จำนวนใบสำคัญรับ (RV)
          </span>
          <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
            {annualStats.totalVouchers} <span className="text-xs font-normal text-slate-600">ฉบับ</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            มีรายการรับ {annualStats.activeMonthsCount} จาก 12 เดือน
          </div>
        </div>
      </div>

      {/* D3 Chart Canvas Container */}
      <div 
        ref={containerRef} 
        className="relative w-full overflow-hidden bg-slate-50/40 rounded-xl border border-slate-100 p-2"
        style={{ minHeight: '270px' }}
      >
        <svg 
          ref={svgRef} 
          width={dimensions.width} 
          height={dimensions.height}
          className="w-full h-auto overflow-visible"
        />

        {/* Floating Tooltip positioned over the bar */}
        {hoveredMonth && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none transition-transform duration-75"
            style={{
              left: `${Math.min(Math.max(tooltipPos.barX, 110), dimensions.width - 110)}px`,
              top: `${Math.max(tooltipPos.y - 120, 10)}px`,
              transform: 'translate(-50%, 0)',
            }}
          >
            <div className="bg-slate-900/95 text-white text-xs rounded-xl shadow-xl p-3 backdrop-blur-xs border border-slate-700 min-w-[210px] space-y-2">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 font-prompt">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>{hoveredMonth.fullTh} {thaiYear}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {hoveredMonth.count} ฉบับ
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between items-center text-slate-300">
                  <span>ยอดรับสุทธิ (Net):</span>
                  <span className="font-mono font-bold text-white text-sm">
                    ฿{formatCurrency(hoveredMonth.revenue)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400 text-[10px]">
                  <span>ยอดก่อนภาษี:</span>
                  <span className="font-mono">฿{formatCurrency(hoveredMonth.subtotal)}</span>
                </div>

                {hoveredMonth.vat > 0 && (
                  <div className="flex justify-between items-center text-slate-400 text-[10px]">
                    <span>ภาษีขาย (VAT 7%):</span>
                    <span className="font-mono text-emerald-300">฿{formatCurrency(hoveredMonth.vat)}</span>
                  </div>
                )}

                {hoveredMonth.wht > 0 && (
                  <div className="flex justify-between items-center text-slate-400 text-[10px]">
                    <span>ถูกหัก ณ ที่จ่าย (3%):</span>
                    <span className="font-mono text-amber-300">฿{formatCurrency(hoveredMonth.wht)}</span>
                  </div>
                )}

                {annualStats.totalRevenue > 0 && (
                  <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                    <span>สัดส่วนรายได้ปี {selectedYear}:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {((hoveredMonth.revenue / annualStats.totalRevenue) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {hoveredMonth.count > 0 && (
                <div className="text-[10px] text-emerald-300/90 text-center pt-1 border-t border-slate-800/80">
                  คลิกที่แท่งเพื่อดูรายการใบสำคัญ ({hoveredMonth.count} รายการ)
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend and Navigation Footnote */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 inline-block"></span>
            <span>รายได้ค่าบริการรับ (RV)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300 inline-block"></span>
            <span>เดือนที่ยังไม่มีรายการรับ</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          <span>วางเมาส์เหนือแท่งเพื่อดูตัวเลขละเอียด หรือคลิกเพื่อเปิดดูรายละเอียดใบสำคัญรับ</span>
        </div>
      </div>

      {/* Modal / Dialog showing vouchers for the clicked month */}
      {selectedMonthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ArrowDownLeft className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 font-prompt text-base">
                    รายการใบสำคัญรับ (RV) - {selectedMonthModal.fullTh} {thaiYear}
                  </h4>
                  <p className="text-xs text-slate-500">
                    รวมทั้งสิ้น {selectedMonthModal.count} ฉบับ • ยอดรับสุทธิ ฿{formatCurrency(selectedMonthModal.revenue)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMonthModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-semibold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Vouchers list */}
            <div className="overflow-y-auto p-5 space-y-3 divide-y divide-slate-100">
              {selectedMonthModal.vouchers.map((v) => (
                <div key={v.id} className="pt-3 first:pt-0 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-lg transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {v.voucherNo}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {v.date}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                        {v.status}
                      </span>
                    </div>
                    <div className="font-medium text-xs text-slate-800">
                      {v.contact.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {v.items[0]?.description || '-'}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-mono font-bold text-emerald-700 text-sm">
                        ฿{formatCurrency(v.netPayable)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ถูกหัก 3%: ฿{formatCurrency(v.totalWht)}
                      </div>
                    </div>

                    {onSelectVoucherToPrint && (
                      <button
                        onClick={() => {
                          setSelectedMonthModal(null);
                          onSelectVoucherToPrint(v);
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        title="พิมพ์ใบสำคัญรับ A4"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>ดู / พิมพ์</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                รวมภาษีถูกหัก 3%: ฿{formatCurrency(selectedMonthModal.wht)}
              </span>
              <button
                onClick={() => setSelectedMonthModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition cursor-pointer"
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
