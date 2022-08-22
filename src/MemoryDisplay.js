import React from "react";
import './Display.css'
export default class MemoryDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.onCellValueUserChanged = this.onCellValueUserChanged.bind(this);
        this.beginCellChange = this.beginCellChange.bind(this);
        this.finishCellChange = this.finishCellChange.bind(this);
        this.state = {
            modifiedCell: -1,
            modifiedCellValue: 0
        }
    }
    onCellValueUserChanged(e) {
        if (e.target.value.match(/[0-f]{1,2}/) != null || e.target.value.length === 0) {
            let value = parseInt(e.target.value, 16);
            this.setState({
                modifiedCellValue: isNaN(value) ? 0 : value
            });
        }
    }
    beginCellChange(e) {
        this.setState({
            modifiedCell: parseInt(e.target.dataset.cell)
        })
    }
    finishCellChange(e) {
        this.props.changeMemoryValue(e.target.dataset.cell, parseInt(e.target.value, 16));
        this.setState({
            modifiedCell: -1,
            modifiedCellValue: 0
        });
    }

    render() {
        let memory = [];
        for (let i = 0; i < (this.props.memory.length / 16); i++) {
            let line = []
            line.push(<td key={i}>{((i * 16) + 0x800).toString(16).padStart(4, '0')}</td>)
            for (let j = 0; j < 16; j++) {
                line.push(<td key={i * 16 + j}>
                    <input className="MemoryCell" size={2} data-cell={i * 16 + j}
                        onChange={this.onCellValueUserChanged}
                        onFocus={this.beginCellChange}
                        onBlur={this.finishCellChange}
                        value={(((i * 16 + j) === this.state.modifiedCell) ? this.state.modifiedCellValue : (this.props.memory[i * 16 + j])).toString(16)} 
                        maxLength = "2"/>
                </td>);

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