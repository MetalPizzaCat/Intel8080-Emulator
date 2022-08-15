import logo from './logo.svg';
import './App.css';
import React from 'react';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      program: [0x3e, 0x78, 0x47, 0x76],
      codeText: "mvi a,78\n mov b,a\n hlt",
      jumps: null,
      programCounter: 0,
      //This emulator has address space from 0800 to 0bb0
      //and 0bb0-0800 is 380 which is 944 in decimal
      stackPointer: 944,
      registry: {
        a: 0,
        b: 0,
        c: 0,
        d: 0,
        e: 0,
        h: 0,
        l: 0
      }
    };
    this.run = this.run.bind(this);
    this.assemble = this.assemble.bind(this);
  }

  advanceProgram() {
    switch (this.state.program[this.state.programCounter]) {
      case 0x3e:
        this.setState(prevState => ({
          registry: {
            a: prevState.program[this.state.programCounter + 1]
          }
        }));
        break;
      case 0x47:
        break;
      case 0x76:
        console.log("HALT!");
        break;
      default:
        throw new Error("Unknown operation code provided at " + this.state.ProgramCounter);
    }
    this.setState(prevState => ({
      programCounter: prevState.programCounter + 1
    }));
  }

  run() {
    let c1 = this.state.ProgramCounter < 945;
    let c2 = this.state.ProgramCounter >= 0;
    let c3 = this.state.program[this.state.ProgramCounter] !== 0x76
    while (this.state.programCounter < 945 && this.state.programCounter >= 0 && this.state.program[this.state.programCounter] !== 0x76) {

    }
    console.log(this.state.registry);
  }

  assemble() {
    this.advanceProgram();
    console.log(this.state.programCounter);
  }

  render() {
    return <div className="App">
      <div className='Controls'>
        <button onClick={this.run}>Run</button>
        <button onClick={this.assemble}>Assemble</button>
      </div>
      <div className='Editors'>
        <div className='OperationStack'>
          {/*all of the operands available */}
          <div>0800 76 HTL</div>
          <div>0800 76 HTL</div>
          <div>0800 76 HTL</div>
          <div>0800 76 HTL</div>
          <div>0800 76 HTL</div>
          <div>0800 76 HTL</div>
          <div>0800 76 HTL</div>
          <div>0800 76 HTL</div>
        </div>
        <div>
          <textarea />
        </div>
      </div>
    </div>
  }
}
