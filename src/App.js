import './App.css';
import React from 'react';
import RegistersDisplay from './RegistersDisplay';
import MemoryDisplay from './MemoryDisplay';
import FlagsDisplay from './FlagsDisplay';
import Interpreter, { convertTextToCode, executionStep } from './Interpreter';
import StackDisplay from './StackDisplay';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      interpreter: new Interpreter()
    };
    this.run = this.run.bind(this);
    this.step = this.step.bind(this);
    this.onCodeInputChanged = this.onCodeInputChanged.bind(this);
  }

  run() {
    this.assemble();
  }

  /**Convert user code into byte code */
  assemble() {
    let code = convertTextToCode(`
    ;simple test program that
    mvi a,4
label:
    adi 4 ; uwu
    mov b,a
    mvi a,255
    mvi c,90
    ;apply &
    ani 240
    ;sta 0800
    ;push b
    ;pop d
    call func
    jmp label
    ; :^)
    hlt
    
    func:
    mvi d,23
    ret
    `);
    this.setState(prev => ({
      interpreter: {
        ...prev.interpreter,
        memory: code
      }
    }));
  }

  /**Step one instruction */
  step() {
    const int = executionStep(this.state.interpreter);
    this.setState({ interpreter: int });
  }

  onCodeInputChanged(e) {
    this.setState({
      codeText: e.value
    });
    console.log(e.value);
  }

  render() {
    return <div className="App">
      <div className='Controls'>
        <button onClick={this.run}>Freeze and die</button>
        <button onClick={this.step}>Step</button>
      </div>
      <div className='Editors'>
        <div className='OperationStack'>
          {/*all of the operands available */}
        </div>
        <div>
          <p>Address : {this.state.interpreter.programCounter}</p>
        </div>
        <div className='Registers'>
          <RegistersDisplay registers={this.state.interpreter.registry} />
        </div>
        <div>
          <textarea onChange={this.onCodeInputChanged} />
        </div>
        <div>
          <FlagsDisplay flags={this.state.interpreter.flags} />
        </div>
        <div>
          <MemoryDisplay memory={this.state.interpreter.memory} />
        </div>
        <div>
          <StackDisplay memory={this.state.interpreter.memory} />
        </div>
      </div>
    </div>
  }
}
