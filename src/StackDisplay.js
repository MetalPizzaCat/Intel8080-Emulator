import React from "react";
import './Display.css'

export default class StackDisplay extends React.Component {
    render() {
        let index = 0;

        return <div className="Stack">
            <p>Memory Stack</p>
            {
                this.props.memory.reverse().map(cell => {
                    const sp = this.props.memory.length - index - 1;
                    const ptr = (this.props.stackPointer === sp) ? "< SP" : "";
                    return <p key={index++}>{(sp + 0x800).toString(16) + ": " + cell.toString(16) + ptr}</p>
                })}
        </div>
    }
}