import React from "react"
import { render } from 'react-dom'
import { CollectionsDropdown } from './components/CollectionsDropdown'

const App = (props) => {
  return(
		<div>
			<CollectionsDropdown />
		</div>  
	)
  // }
}

// export default App

const container = document.getElementById("add_to_collection")
render(<App />, container)
