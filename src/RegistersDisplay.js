import React from "react";

export default class RegistersDisplay extends React.Component {
    render() {
        return <div>
            <div key="A">A {this.props.registers.a}</div>
            <div key="B">B {this.props.registers.b}</div>
            <div key="C">C {this.props.registers.c}</div>
            <div key="D">D {this.props.registers.d}</div>
            <div key="E">E {this.props.registers.e}</div>
            <div key="H">H {this.props.registers.h}</div>
            <div key="L">L {this.props.registers.l}</div>
        </div>
    }
}