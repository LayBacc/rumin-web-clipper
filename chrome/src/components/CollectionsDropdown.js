import React, { useState, useEffect } from "react";
import { ClickHandler } from './ClickHandler'

export const CollectionsDropdown = (props) => {
  const [query, setQuery] = useState('')
  const [selectedSpaces, setSelectedSpaces] = useState([])
  const [prevSelectedSpaces, setPrevSelectedSpaces] = useState([])
  const [prevSpaceSuggestions, setPrevSpaceSuggestions] = useState([])
  const [hasStoragePermission, setHasStoragePermission] = useState(false)
  const [queryTimer, setQueryTimer] = useState(null)
	
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [hasFetchedSuggestions, setHasFetchedSuggestions] = useState(false)
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false)

  const [spaceSuggestions, setSpaceSuggestions] = useState([]) // results

  useEffect(() => {
    chrome.permissions.contains({
      permissions: ['storage']
    }, result => {
      if (result) {
        setHasStoragePermission(true)

        chrome.storage.local.get(['selectedSpaces', 'prevSelectedSpaces', 'prevSpaceSuggestions'], result => {
          if (result.selectedSpaces && result.selectedSpaces.length > 0 && selectedSpaces.length === 0) {
            setSelectedSpaces(result.selectedSpaces)
            window.selectedSpaces = result.selectedSpaces
          }

          if (result.prevSelectedSpaces && result.prevSelectedSpaces.length > 0) {
            setPrevSelectedSpaces(result.prevSelectedSpaces)
          }
          // if (result.prevSpaceSuggestions && result.prevSpaceSuggestions.length > 0) {
          //   setPrevSpaceSuggestions(result.prevSpaceSuggestions)
          // }
        })
      }
    })
  }, [])

  const uniqueSuggestions = (suggestions) => {
    let results = []
    let seen = {}
    suggestions.forEach(s => {
      if (seen[s.id] === true) {
        return
      }

      results.push(s)
      seen[s.id] = true
    })

    return results
  }

  const updateSelectedSpaces = (selected) => {
    setSelectedSpaces(selected)
    window.selectedSpaces = selected

    if (hasStoragePermission) {
      chrome.storage.local.set({ selectedSpaces: selected })

      // cache the previously selected spaces
      chrome.storage.local.get(['prevSelectedSpaces'], result => {
        const cachedResults = result.prevSelectedSpaces || []
        const suggestionsToCache = uniqueSuggestions([...cachedResults.slice(0, 100), ...selected])
        chrome.storage.local.set({ prevSelectedSpaces: suggestionsToCache })
      })
    }
  }

  const handleSuggestionClick = (space) => {
    const updatedSelection = [...selectedSpaces, space]
    updateSelectedSpaces(updatedSelection)
    setQuery('')
    setShowSuggestionsDropdown(false)
  }

  const handleRemoveToken = (space) => {
    const updatedSelection = selectedSpaces.filter(s => s.id !== space.id)
    updateSelectedSpaces(updatedSelection)
  }

  const fetchAutosuggest = () => {
    if (query.length < 2) return

    setHasFetchedSuggestions(false)
    setIsFetchingSuggestions(true)
    
    fetch(`https://getrumin.com/api/v1/search/?q=${query}&content_type=Space&lite=true`, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json'
      }
    })
    .then(res => {
      if (!res.ok) throw new Error(res.status)
      else return res.json()
    })
    .then(data => {
      setShowSuggestionsDropdown(true)
      setSpaceSuggestions(data.results)

      setIsFetchingSuggestions(false)
      setHasFetchedSuggestions(true)

      // cache the response
      // if (hasStoragePermission) {
      //   chrome.storage.local.get(['prevSpaceSuggestions'], result => {
      //     const cachedResults = result.prevSpaceSuggestions || []
          
      //     const suggestionsToCache = uniqueSuggestions([...cachedResults.slice(0, 100), ...data.results])
      //     chrome.storage.local.set({ prevSpaceSuggestions: suggestionsToCache })
      //   })
      // }
    })
    .catch(error => {
      console.log('error: ' + error)
    })
  }

  const handleInputFocus = () => {

    // if there is no query, use previously selected spaces
    if (query.length === 0 && prevSelectedSpaces.length > 0) {
      setShowSuggestionsDropdown(true)

      const suggestions = prevSelectedSpaces.slice(0, 20).filter(s => {
        return !selectedSpaces.map(ss => ss.id).includes(s.id)
      }) 
      // console.log('in handleInputFocus', suggestions, spaceSuggestions.map(ss => ss.id), prevSelectedSpaces)

      setSpaceSuggestions(suggestions)
    }
  }

  const handleQueryChange = (e) => {
    setQuery(e.target.value)
  }

  const handleQueryKeyDown = (e) => {
    if (e.key === 'Backspace' && query.length === 0) {
      handleRemoveToken(selectedSpaces[selectedSpaces.length-1])
    }

    if (e.key === 'Escape') {
      props.closeDropdown()
    }
  }

  const handleQueryKeyUp = () => {
    clearTimeout(queryTimer)
    const timer = setTimeout(() => { fetchAutosuggest() }, 750)
    setQueryTimer(timer)
  }

  const handleNewSpaceClick = () => {
    const body = {
      title: query
    }

    fetch(`https://getrumin.com/api/v1/spaces/`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    .then(res => {
      if (!res.ok) throw new Error(res.status)
      else return res.json()
    })
    .then(space => {
      // success
      const updatedSelection = [...selectedSpaces, space]
      updateSelectedSpaces(updatedSelection)
      setQuery('')
    })
    .catch(error => {
      console.log('error: ' + error)
    }) 
  }

  const buildResults = () => {
    // console.log(query.length, hasFetchedSuggestions, spaceSuggestions.length, spaceSuggestions)

    if (query.length > 0 && hasFetchedSuggestions && spaceSuggestions.length === 0) {
      return(
        <div 
          className="as-msg gray-text"
        >
          No matching results
        </div>
      )
    } 

    // if (query.length < 2) return ''
    return spaceSuggestions.map(space => {
      return(
        <SuggestionResult 
          key={`suggestion_${space.id}`}
          space={space}
          handleSuggestionClick={handleSuggestionClick} 
        />
      );
    });
  }

  const buildSelectedTokens = () => {
    return selectedSpaces.map(space => {
      return(
        <div className="token">
        	<span>
	          { space.title } 
	        </span>
          <div 
            className="remove-btn"
            onClick={() => handleRemoveToken(space)}
          >
            <svg viewBox="0 0 8 8" className="closeThick" style={{width: '8px', height: '8px', display: 'block', fill: 'inherit', flexShrink: 0, backfaceVisibility: 'hidden', opacity: 0.5}}><polygon points="8 1.01818182 6.98181818 0 4 2.98181818 1.01818182 0 0 1.01818182 2.98181818 4 0 6.98181818 1.01818182 8 4 5.01818182 6.98181818 8 8 6.98181818 5.01818182 4"></polygon></svg>
          </div>
        </div>
      )
    })
  }

  const buildFetchingMoreMsg = () => {
    if (!isFetchingSuggestions) return ''

    return(
      <div 
        className="as-msg gray-text"
      >
        fetching more results...
      </div>
    )
  }

  const buildASResultsSection = () => {
    if (!showSuggestionsDropdown) return ''
    // if (!showSuggestionsDropdown || spaceSuggestions.length < 1) return ''

    return(
      <ClickHandler
        close={() => setShowSuggestionsDropdown(false)}
      >
      	<div className="collections-dropdown">
  	      <div className="section results" style={{borderBottom: '1px solid #ccc'}}>
  	        { buildCreateCollection() }
  	        { buildResults() }
            { buildFetchingMoreMsg() }
  	      </div>
  	    </div>
      </ClickHandler>
    )
  }

  const buildCreateCollection = () => {
    if (query.length < 1) return ''

    return(
      <div 
        role="button"
        className="as-result"
        onClick={handleNewSpaceClick}
      >
        + New page "{ query }"
      </div>
    )
  }

  return(
  	<div className="collections-dropdown-container">
      <div className="field-label"><i className="fa fa-tags small-icon"></i> Add to collections</div>

      <div className="collections-selected">
        { buildSelectedTokens() }

        <div className="collections-search-container">
          <input 
            className="collections-search" 
            placeholder="Type to search collections" 
            value={query}
            onFocus={handleInputFocus}
            onChange={handleQueryChange} 
            onKeyDown={handleQueryKeyDown}
            onKeyUp={handleQueryKeyUp}
          />
        </div>
      </div>
      
	    { buildASResultsSection() }
    </div>
  );
}

const SuggestionResult = (props) => {
  const handleClick = () => {
    props.handleSuggestionClick(props.space)
  }

  return(
    <div 
      className="as-result"
      onClick={handleClick}
    >
      { props.space.title }
    </div>
  )
}

const SuggestedLinkToken = (props) => {
  return(
    <div className="token">
      { props.space.title }
      <div 
        className="remove-btn"
      >
        <svg viewBox="0 0 8 8" className="closeThick" style={{width: '8px', height: '8px', display: 'block', fill: '#ffffff', flexShrink: 0, backfaceVisibility: 'hidden', opacity: 0.5}}><polygon points="8 1.01818182 6.98181818 0 4 2.98181818 1.01818182 0 0 1.01818182 2.98181818 4 0 6.98181818 1.01818182 8 4 5.01818182 6.98181818 8 8 6.98181818 5.01818182 4"></polygon></svg>
      </div>
    </div>
  )
}
