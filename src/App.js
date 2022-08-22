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
    this.reset = this.reset.bind(this);
    this.changeMemoryValue = this.changeMemoryValue.bind(this);
    this.changeRegisterValue = this.changeRegisterValue.bind(this);
  }

  run() {
    this.assemble();
  }

  /**Convert user code into byte code */
  assemble() {
    let code = convertTextToCode(this.state.codeText);
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
      codeText: e.target.value
    });
    console.log(e.target.value);
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

  render() {
    return <div className="App">
      <div className='Controls'>
        <button onClick={this.run}>Assemble</button>
        <button onClick={this.step}>Step</button>
        <button onClick={this.reset}>Clear memory</button>
      </div>
      <div className='Editors'>
        <div className='OperationStack'>
          {/*all of the operands available */}
        </div>
        <div>
          <p>Address : {this.state.interpreter.programCounter}</p>
        </div>
        <div className='Registers'>
          <RegistersDisplay onRegisterValueModified={this.changeRegisterValue} registers={this.state.interpreter.registry} />
        </div>
        <div>
          <textarea onChange={this.onCodeInputChanged} />
        </div>
        <div>
          <FlagsDisplay flags={this.state.interpreter.flags} />
        </div>
        <div>
          <MemoryDisplay changeMemoryValue={this.changeMemoryValue} memory={this.state.interpreter.memory} />
        </div>
        <div>
          <StackDisplay memory={this.state.interpreter.memory} />
        </div>
      </div>
    </div>
  }
}
