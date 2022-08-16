import React from "react";

export default class MemoryDisplay extends React.Component {
    render() {
        let memory = [];
        for (let i = 0; i < this.props.memory.length; i++) {
            let line = []
            for (let j = 0; j < 16; j++) {
                line.push(<th key={i * 16 + j}>{this.props.memory[i * 16 + j]}</th>);
            }
            memory.push(<tr key={i}>{line}</tr>)
        }
        return <div>
            <table>
                <tr>
                    <th>0</th>
                    <th>1</th>
                    <th>2</th>
                    <th>3</th>
                    <th>4</th>
                    <th>5</th>
                    <th>6</th>
                    <th>7</th>
                    <th>8</th>
                    <th>9</th>
                    <th>A</th>
                    <th>B</th>
                    <th>C</th>
                    <th>D</th>
                    <th>E</th>
                    <th>F</th>
                </tr>
                {memory}
            </table>
        </div>
    }
}