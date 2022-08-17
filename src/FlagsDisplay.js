import React from "react"

export default class FlagsDisplay extends React.Component {
    render() {
        return <div>
            <table>
                <thead>
                    <tr>
                        <th>S</th>
                        <th>Z</th>
                        <th>AC</th>
                        <th>P</th>
                        <th>C</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{this.props.flags.s ? 1 : 0}</td>
                        <td>{this.props.flags.z ? 1 : 0}</td>
                        <td>{this.props.flags.ac ? 1 : 0}</td>
                        <td>{this.props.flags.p ? 1 : 0}</td>
                        <td>{this.props.flags.c ? 1 : 0}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    }
}