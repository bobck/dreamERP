import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";
import {useLayoutEffect, useRef} from "react";

am4core.useTheme(am4themes_animated);

export const CharApp = (props) => {
    const chartRef = useRef(null);
    const dateAxisRef = useRef(null);


    useLayoutEffect(() => {

        let chart = am4core.create("chartdiv", am4charts.XYChart);
        chart.paddingRight = 20;


        let dateAxis = chart.xAxes.push(new am4charts.DateAxis());
        dateAxis.baseInterval = {
            "timeUnit": "minute",
            "count": 1
        };
        dateAxis.tooltipDateFormat = "HH:mm, d MMMM";
        dateAxisRef.current = dateAxis;


        let valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.tooltip.disabled = true;
        valueAxis.title.text = "Kilometres";

        let series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.dateX = "time";
        series.dataFields.valueY = "kilometres";
        series.tooltipText = "[bold]{valueY}[/] km";
        series.fillOpacity = 0.6;
        series.propertyFields.fill = "lineColor";
        series.propertyFields.stroke = "lineColor";

        chart.events.on("hit", function (ev) {
            // console.log(series.tooltipDataItem);
            // console.log(ev);
        }, this);


        chart.cursor = new am4charts.XYCursor();
        chart.cursor.lineY.opacity = 0;
        chart.scrollbarX = new am4charts.XYChartScrollbar();
        chart.scrollbarX.series.push(series);
        chartRef.current = chart;


        dateAxis.start = 0;
        dateAxis.keepSelection = true;


        return () => {
            chart.dispose();
        };
    }, []);

    useLayoutEffect(() => {
        chartRef.current.data = props.data.parsed;
        dateAxisRef.current.title.text = props.data.yInfo
    }, [props.data]);

    return (
        <div id="chartdiv" style={{width: "100%", height: "500px"}}/>
    );
}