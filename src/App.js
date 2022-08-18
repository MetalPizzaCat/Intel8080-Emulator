import logo from './logo.svg';
import './App.css';
import React from 'react';
import RegistersDisplay from './RegistersDisplay';
import MemoryDisplay from './MemoryDisplay';
import FlagsDisplay from './FlagsDisplay';
import Interpreter, { stepProgram } from './Interpreter';

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

  run() { }

  assemble() { }

  /**Convert user's text input into data structure suitable for this program */
  step() {
    this.setState(prev => ({
      interpreter: stepProgram(prev.interpreter)
    }));
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
      </div>
    </div>
  }
}
