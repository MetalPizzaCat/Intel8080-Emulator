import './App.css';
import React from 'react';
import RegistersDisplay from './RegistersDisplay';
import MemoryDisplay from './MemoryDisplay';
import FlagsDisplay from './FlagsDisplay';
import Interpreter, { executionStep } from './Interpreter';
import { convertTextToCode } from './Parser';
import StackDisplay from './StackDisplay';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      interpreter: new Interpreter(),
      /**Errors that occurred during assembly process */
      assemblyErrors: [],
      lineNumbers: []
    };
    this.run = this.run.bind(this);
    this.step = this.step.bind(this);
    this.onCodeInputChanged = this.onCodeInputChanged.bind(this);
    this.reset = this.reset.bind(this);
    this.changeMemoryValue = this.changeMemoryValue.bind(this);
    this.changeRegisterValue = this.changeRegisterValue.bind(this);
    this.resetCounters = this.resetCounters.bind(this);
  }

  run() {
    this.assemble();
  }

  /**Convert user code into byte code */
  assemble() {
    let code = convertTextToCode(this.state.codeText);
    let errorMessages = [];
    code.errors.forEach(error => {
      errorMessages.push(<p className='Error' key={error.line}>{"Line " + (error.line + 1).toString() + ". " + error.error}</p>);
    });
    this.setState(prev => ({
      interpreter: {
        ...prev.interpreter,
        memory: code.program
      },
      errors: errorMessages
    }));
  }

  /**Step one instruction */
  step() {
    try {
      if (!this.state.interpreter.finishedExecution) {
        const int = executionStep(this.state.interpreter);
        this.setState({ interpreter: int });
      }
    }
    catch (error) {
      this.setState({
        errors: [<p className='Error' key={1}>{"Execution error: " + error.message}</p>]
      })
    }
  }

  onCodeInputChanged(e) {
    this.setState({
      codeText: e.target.value,
      lineNumbers: Array(e.target.value.split('\n').length).fill(<span></span>)
    });
  }

  reset() {
    this.setState({
      interpreter: new Interpreter()
    });
  }

  /**Changes value of the memory cell directly
   * Used for letting user write to memory directly
  */
  changeMemoryValue(cell, newValue) {
    let interpreter = { ...this.state.interpreter };
    interpreter.memory[cell] = newValue;
    this.setState({
      interpreter: interpreter
    });
  }

  changeRegisterValue(register, value) {
    let interpreter = { ...this.state.interpreter };
    interpreter.registry[register] = value;
    this.setState({
      interpreter: interpreter
    });
  }

  resetCounters() {
    let interpreter = { ...this.state.interpreter };
    interpreter.stackPointer = 0xbb0 - 0x800;
    interpreter.programCounter = 0;
    interpreter.finishedExecution = false;
    interpreter.registry = {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      h: 0,
      l: 0
    };
    this.setState({
      interpreter: interpreter
    });
  }
  render() {
    return <div className="App">
      <div className='Controls'>
        <button onClick={this.run}>Assemble</button>
        <button onClick={this.step}>Step</button>
        <button onClick={this.reset}>Clear memory</button>
        <button onClick={this.resetCounters}>Reset counters</button>
      </div>
      <div className='Editors'>
        <div>
          <p>Code editor: </p>
          <div className='Code'>

            <div className='CodeEditorBlock'>
              <div className='Info'>
                <p>Numbers are in decimal by default</p>
                <p>To write in hex use <code>0x</code> prefix</p>
              </div>
              <div className='CodeEditorLineNumbers'>
                {this.state.lineNumbers}
              </div>
              <textarea className='CodeEditor' onChange={this.onCodeInputChanged} />
            </div>
          </div>
          <p className='ErrorBlockName'>Errors: </p>
          <div className='Errors'>
            {this.state.errors}
          </div>
        </div>
        <div className='InfoBlock'>
          <div className='IntermediateInfo'>
            <FlagsDisplay flags={this.state.interpreter.flags} />
            <RegistersDisplay className='Registers'
              onRegisterValueModified={this.changeRegisterValue}
              registers={this.state.interpreter.registry} />
          </div>
          <div>
            <p>Processor counters</p>
            <span>SP : {(this.state.interpreter.stackPointer + 0x800).toString(16) + " | "}</span>
            <span>PC : {(this.state.interpreter.programCounter + 0x800).toString(16)}</span>
          </div>

          <div className='Memory'>
            <MemoryDisplay changeMemoryValue={this.changeMemoryValue} programCounter={this.state.interpreter.programCounter} memory={this.state.interpreter.memory} />
            <StackDisplay memory={this.state.interpreter.memory}
              stackPointer={this.state.interpreter.stackPointer} />
          </div>
        </div>
      </div>
    </div>
  }
}
