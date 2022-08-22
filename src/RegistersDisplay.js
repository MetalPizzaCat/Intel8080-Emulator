import React from "react";

export default class RegistersDisplay extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentRegister: -1,
            value: 0
        };
        this.beginValueModify = this.beginValueModify.bind(this);
        this.onValueModify = this.onValueModify.bind(this);
        this.finishValueModify = this.finishValueModify.bind(this);
    }

    beginValueModify(e) {
        this.setState({
            currentRegister: e.target.dataset.registry
        });
    }
    onValueModify(e) {
        if (e.target.value.match(/[0-f]{1,2}/) != null || e.target.value.length === 0) {
            let value = parseInt(e.target.value, 16);
            this.setState({
                value: isNaN(value) ? 0 : value
            });
        }
    }
    finishValueModify(e) {
        this.props.onRegisterValueModified(this.state.currentRegister, this.state.value);
        this.setState({
            currentRegister: -1,
            value: 0
        });
    }
    render() {
        let registry = [];
        for (const [key, value] of Object.entries(this.props.registers)) {
            registry.push(<div>{key}
                <input size={2}
                    key={key}
                    data-registry={key}
                    onFocus={this.beginValueModify}
                    onChange={this.onValueModify}
                    onBlur={this.finishValueModify}
                    value={((key === this.state.currentRegister) ? this.state.value : value).toString(16)}
                    maxLength="2" />
            </div>);
        }
        return <div>{registry}</div>
    }
}