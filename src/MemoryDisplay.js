import React from "react";

export default class MemoryDisplay extends React.Component {
    render() {
        let memory = [];
        for (let i = 0; i < (this.props.memory.length / 16); i++) {
            let line = []
            line.push(<td key={i}>{((i * 16) + 0x800).toString(16).padStart(4, '0')}</td>)
            for (let j = 0; j < 16; j++) {
                line.push(<td key={i * 16 + j}>{(this.props.memory[i * 16 + j]).toString(16).padStart(2, '0')}</td>);
            }
            memory.push(<tr key={i}>{line}</tr>)
        }
        return <div className="Memory">
            <table>
                <tr>
                    <th>Address</th>
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