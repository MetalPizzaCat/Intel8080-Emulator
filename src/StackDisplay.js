import React from "react";
import './Display.css'

export default class StackDisplay extends React.Component {
    render() {
        let index = 0;
        return <div className="Stack">
            {this.props.memory.reverse().map(cell =>
                <p key={index++}>{cell.toString(16)}</p>
            )}
        </div>
    }
}