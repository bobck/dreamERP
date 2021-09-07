import React, {useState} from 'react';
import {CharApp} from "../components/Char";
import {ChartInputApp} from "../components/ChartInput";

export const WorkFlowPage = () => {
    // const generateChartData = () => {
    //
    //     const chartData = [];
    //     let visits = 500
    //     // current date
    //     const firstDate = new Date();
    //     // now set 500 minutes back
    //     firstDate.setMinutes(firstDate.getDate() - 500);
    //
    //     // and generate 500 data items
    //     // let visits = 500;
    //     for (let i = 0; i < 500; i++) {
    //         if (i % 2 !== 0) continue
    //
    //         const newDate = new Date(firstDate);
    //         // each time we add one minute
    //         newDate.setMinutes(newDate.getMinutes() + i);
    //         // some random number
    //         visits += Math.round((Math.random() < 0.5 ? 1 : -1) * Math.random() * 10);
    //         // add data item to the array
    //         const newPoint = {
    //             time: newDate,
    //             kilometres: visits,
    //         }
    //         if (i === 200) newPoint.lineColor = "#618985"//chart.colors.next()
    //         chartData.push(newPoint);
    //     }
    //     return chartData;
    // }
    const [data, setData] = useState({});

    return (
        <>
            <div className="container">
                <div className="section">
                    <div className="row">
                        <ChartInputApp setData={setData}/>
                    </div>
                </div>
            </div>
            <div className="row">
                <CharApp data={data}/>
            </div>
        </>
    )
}