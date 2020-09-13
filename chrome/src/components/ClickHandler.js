import React, { PureComponent } from "react"

export class ClickHandler extends PureComponent {
  constructor(props, context) {
    super(props, context)

    this.handleClickOutside = this.handleClickOutside.bind(this)
  }

  componentDidMount() {
    document.addEventListener("mousedown", this.handleClickOutside)
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleClickOutside)
  }

  handleClickOutside(e) {
    if (
      this.wrapperRef &&
      !this.wrapperRef.contains(e.target)
    ) {
      this.props.close()
    }
  }

  render() {
    return(
      <span 
        className={this.props.hidden ? 'hidden' : ''} 
        ref={node => (this.wrapperRef = node)} 
        style={{width: '100%', height: '100%', display: `${this.props.displayBlock ? 'block' : 'inline'}`}}
      >{this.props.children}</span>
    )
  }
}
