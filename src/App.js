import logo from './logo.svg';
import './App.css';
import React from 'react';
import RegistersDisplay from './RegistersDisplay';
import MemoryDisplay from './MemoryDisplay';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      /**
      * Operations are stored not as op codes but in a more convenient format that 
      * stores operation name and operands, reducing need for weird jumps depending on
      * how long is the operation and reducing amount of switch cases needed
      * 
      *(there are at least 20 mov operations, i'm not doing them all by hand :O )
      */
      program: [
        {
          operation: "mvi",
          arg1: "a",
          arg2: 3
        },
        {
          operation: "mov",
          arg1: "b",
          arg2: "a"
        },
        {
          operation: "sta",
          arg1: 0x0800
        },
        {
          operation: "htl"
        }
      ],
      memory: Array(0xbb0 - 0x800).fill(0),
      codeText: "mvi a,78\n mov b,a\n hlt",
      /**
       * Jumps is map of all jump labels present in the program
       * index is relative to processed program rather then original program id
       */
      jumps: [],
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
    const operand = this.state.program[this.state.programCounter];
    switch (operand.operation) {
      case "mov":
        this.setState(function (prev) {
          prev.registry[operand.arg1] = prev.registry[operand.arg2];
          return {
            registry: {
              ...prev.registry,
            }
          };
        });
        break;
      case "mvi":
        this.setState(function (prev) {
          prev.registry[operand.arg1] = operand.arg2;
          return {
            registry: {
              ...prev.registry,
            }
          };
        });
        break;
      case "sta":
        this.setState(function (prev) {
          prev.memory[operand.arg1 - 0x800] = prev.registry.a;
          return {
            memory: prev.memory
          };
        });
        break;
      case "htl":
        console.info("Finished execution");
        break;
      default:
        console.error("Unknown operand " + this.state.program[this.state.programCounter].operation);
        break;
    }
    this.setState(prevState => ({
      programCounter: prevState.programCounter + 1
    }));
    console.log(this.state.registry);
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
        <button onClick={this.run}>Freeze and die</button>
        <button onClick={this.assemble}>Step</button>
      </div>
      <div className='Editors'>
        <div className='OperationStack'>
          {/*all of the operands available */}
        </div>
        <div className='Registers'>
          <RegistersDisplay registers={this.state.registry} />
        </div>
        <div>
          <MemoryDisplay memory={this.state.memory} />
        </div>
        <div>
          <textarea />
        </div>
      </div>
    </div>
  }
}
