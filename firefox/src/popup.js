(function() {
  let favIconUrl;
  let title;
  let pageUrl;
  let selection;
  let note;
  let page_dom;
  let hasStoragePermission = false;
  let searchQuery = '';
  let customFields = {};

  function delay(fn, ms) {
	  let timer = 0
	  return function(...args) {
	    clearTimeout(timer)
	    timer = setTimeout(fn.bind(this, ...args), ms || 0)
	  }
	}

  function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

  const serializeHTML = (node) => {
    if (typeof node.text === 'string') {
      return escapeHtml(node.text)
    }

    const children = node.children.map(n => serializeHTML(n)).join('')

    let url
    if (node.url) {
      if (node.url.startsWith('/spaces/') || node.url.startsWith('/activities/')) {
        url = `https://getrumin.com${node.url}`
      }
      else {
        url = node.url
      }
    }

    switch (node.type) {
      case 'quote':
        return `<blockquote><p>${children}</p></blockquote>`
      case 'paragraph':
        return `<p>${children}</p>`
      case 'link':
        return `<a href="${escapeHtml(url)}" target="_blank">${children}</a>`
      case 'list-item':
        return `<li>${children}</li>`
      case 'heading-one':
        return `<h1>${children}</h1>`
      case 'heading-two':
        return `<h2>${children}</h2>`
      case 'heading-three':
        return `<h3>${children}</h3>`
      default:
        return children
    }
  }

  function activityData() {
    title = $('#captured_title_field').val();
    note = $('#captured_note_field').val();

    let params = {
      title: title,
      url: pageUrl,
      selection: selection,
      favicon_url: favIconUrl,
      note: note || '',
      // page_dom: page_dom,
      screenshot: $('#screenshot_img').attr('src'),
      custom_fields: customFields
    }

    if (window.selectedSpaces) {
      params.in_collections = window.selectedSpaces
    }

    return params
  }

  function buildActivity(activity) {
    let youtubeString = ''
    if (activity.url && activity.url.startsWith('https://www.youtube.com') && activity.custom_fields && activity.custom_fields.current_time) {
      youtubeString = `<div class="custom-field">Video at ${activity.custom_fields.current_time}</div>`
    }

    return(`
      <div class="list-item">
        <div class="title">
          <a href="https://getrumin.com/activities/${activity.id}" target="_blank">${ activity.title }<i class="fa fa-external-link" style="margin-left: 0.5em; font-size: 0.8em;"></i></a>
        </div>
        <div class="timestamp">
          created ${ new Date(activity.created_at).toISOString().slice(0,10) }&nbsp;&nbsp;&nbsp;&nbsp;last updated ${ new Date(activity.updated_at).toISOString().slice(0,10) }
        </div>
        ${ youtubeString }
        <div class="captured-selection ${activity.selection ? '' : 'hidden'}">
          <em>
            <div>
            	${ activity.selection }
            </div>
          </em>
        </div>
        <div class="text-body">
          <div>${ serializeHTML({ children: activity.json_body }) }</div>
        </div>
      </div>
    `)
  }

  function buildSpace(space) {
  	return(`
  		<div class="list-item">
        <div class="title">
          <a href="https://getrumin.com/spaces/${space.id}" target="_blank">${ space.title } <i class="fa fa-external-link" style="margin-left: 0.5em; font-size: 0.8em;"></i></a>
        </div>
        <div class="timestamp">
          created ${ new Date(space.created_at).toISOString().slice(0,10) }&nbsp;&nbsp;&nbsp;&nbsp;last updated ${ new Date(space.created_at).toISOString().slice(0,10) }
        </div>
        <div class="text-body">
        	<div>${ space.text_body.length > 500 ? space.text_body.slice(0, 500) + '...' : space.text_body }</div>
        </div>
      </div>
  	`)
  }

  function buildCustomField(name, value) {
    if (typeof value === 'object') {
      value = JSON.stringify(value, null, 2)
    }

    return(`
      <div style="margin-bottom: 0.5em;">
        <div class="prop-name" style="margin-right: 0.5em;">${ name }:</div>
        <div class="prop-value">${ value }</div>
      </div>
    `)
  }

  function fetchMatchingPages() {
    $.ajax({
      url: `https://getrumin.com/api/v1/search/?url=${encodeURIComponent(encodeURIComponent(pageUrl))}`, 
      method: 'GET',
      contentType: 'application/json',
      success: function(data) {
        if (data.length === 0) {
        	$('#search_results').html('<div style="width: 100%; text-align: center">No matching results on this page</div>')
        	return
        }

        const resultElements = data.map(obj => {
          // console.log('obj', obj.content_type, obj.title, obj)

          if (obj.content_type === 'Activity') {
            return buildActivity(obj)
          }
          else {
            return buildSpace(obj)
          }
        }).join('')


        $('#search_results').html(`<div class="heading">Related to this page</div>${resultElements}`)
      },
      error: function(error) {
        console.log('API error', error);
      }
    });  
  }

  function sendMsgToContentScript(msg) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, msg, function(response) {})
    });
  }

  chrome.runtime.sendMessage({popupOpen: true});

  chrome.runtime.onMessage.addListener(function(req, sender, sendResponse) {

    if (hasStoragePermission) {
      chrome.storage.local.get(['noteValue', 'titleValue'], function(result) {
        if (result.titleValue) {
          title = result.titleValue
          $('#captured_title_field').val(result.titleValue)
        }

        if (result.noteValue) {
          $('#captured_note_field').val(result.noteValue)
        }
      })
    }

    if (req.pageContext) {

      favIconUrl = sender.tab.favIconUrl;
      
      // no saved title from local storage
      if (!title || (title && title.trim() === '')) {
        title = req.pageContext.titleOverride ? req.pageContext.titleOverride : sender.tab.title;
        title = title.slice(0, 300)
      }

      pageUrl = req.pageContext.urlOverride ? req.pageContext.urlOverride : sender.tab.url;
      selection = req.pageContext.selection;
      // page_dom = req.pageContext.page_dom;
      customFields = req.pageContext.customFields;

      // get it for the Lookup tab
      fetchMatchingPages()

      if (title.trim() !== '') {
        $('#captured_title_field').val(title.trim());
      }
      else {
        $('#captured_title_field').val(pageUrl);
      }

      if (selection.trim()) {
        $('#captured_selection').text(selection.slice(0, 300));
      }
      else {
        $('.captured-selection').hide()
      }

      if (Object.keys(customFields).length > 0) {
        $('#custom_fields_section').removeClass('hidden')
        
        const divider = '<div class="divider"></div>'

        const customFieldElements = Object.keys(customFields).map(fieldName => {

          return buildCustomField(fieldName, customFields[fieldName])
        }).join(divider)

        $('#custom_fields').html(`
          <div>
            ${ customFieldElements }
          </div>
        `)
      }

      // Site-specific selection and actions
      if (pageUrl.startsWith('https://app.slack.com/client/')) {
        $('#add_slack_selection').removeClass('hidden')
      }

      if (pageUrl.includes('reddit.com/r/') && pageUrl.includes('comments')) {
        // console.log('showing reddit btn')
        $('#add_reddit_selection').removeClass('hidden')
      }
    }

    if (req.screenshotCaptured) {
      $('#screenshot_img').removeClass('hidden')
      $('#screenshot_img').attr('src', req.screenshotData)

      // Tesseract.recognize(
      //   req.screenshotData,
      //   'eng',
      //   { logger: m => console.log(m) }
      // ).then(({ data: { text } }) => {
      //   console.log('recognized text from screenshot', text);
      // })

      // TODO - convert OCR here
    }
  });

  $(function() {
    var noteSelectionStart;
    var noteSelectionEnd;

    chrome.permissions.contains({
      permissions: ['storage']
    }, function(result) {
      if (result) {
        $('#permission_bar').hide()
        hasStoragePermission = true

        // notify content script
        sendMsgToContentScript({hasStoragePermission: true})       
      }
    })

    $('#save_btn').click(function() {
      // disable button
      $('#save_btn').html('<div style="width: 100%; text-align: center"><img src="images/spinner.gif" width="32" height="32" style="margin: auto; display: block" /><p><small>Saving...Do not close this</small></p></div>')
      $('#save_btn').removeClass()


      if (hasStoragePermission) {
        // chrome.storage.local.clear()
        chrome.storage.local.remove(['titleValue', 'noteValue'])
        sendMsgToContentScript({ cancelSelection: true })
        sendMsgToContentScript({clearSelection: true})
      }

      $.ajax({
        url: 'https://getrumin.com/api/v1/activities/', //'http://127.0.0.1:8000/api/v1/activities/',//'https://getrumin.com/api/v1/activities/', 
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(activityData()),
        success: function(data) {
          $('.capture-container').html(`
            <p>The content is successfully saved.</p>
            <div>
              <a href="https://getrumin.com/activities/${data.id}" target="_blank">Go to page</a>
            </div>
          `)
        },
        error: function(error) {
          console.log('API error', error);
        }
      });
    });

    $('#custom_fields_heading').click(function() {
      $('.custom-fields-content').toggleClass('hidden')
      $('#custom_fields_display_icon').toggleClass('hidden')
    })

    $('#screenshot_btn').click(function() {
      chrome.runtime.sendMessage({takeScreenshot: true});
    })

    // TODO - finish implementing, so that the user doesn't remove the selection
    // $('#captured_note_field').keydown(function(e) {
    //   var cursorStart = e.target.selectionStart
    //   var cursorEnd = e.target.selectionEnd
      
    //   if (cursorEnd > cursorStart && e.key === '{') {
    //     noteSelectionStart = cursorStart
    //     noteSelectionEnd = cursorEnd
    //   }
    // })


    $('#captured_title_field').change(function(e) {
      if (hasStoragePermission) {
        chrome.storage.local.set({titleValue: e.target.value}, function() { console.log('setting noteValue in storage') })
      }
    })

    $('#captured_note_field').change(function(e) {
      if (hasStoragePermission) {
        chrome.storage.local.set({noteValue: e.target.value}, function() {})
      }
    })


    $('#captured_note_field').keyup(function(e) {
      // console.log('selection start', e.target.selectionStart, 'selection end', e.target.selectionEnd)

      if (e.key === '{') {
        // this is wrong
        // console.log(noteSelectionStart, noteSelectionEnd)

        var cursorStart = e.target.selectionStart
        var cursorEnd = e.target.selectionEnd
        var value = e.target.value


        e.target.value = value.slice(0, cursorStart) + '}' + value.slice(cursorStart,)
        e.target.selectionEnd = cursorStart
      }
    })

    // fetch search results
    $('#search_box').keyup(delay(function(e) {
    	searchQuery = e.target.value
    	$('#search_results').html('<div style="width: 100%; text-align: center">fetching...</div>')

    	$.ajax({
        url: `https://getrumin.com/api/v1/search?q=${searchQuery}&is_as=true/`, 
        method: 'GET',
        contentType: 'application/json',
        success: function(data) {
        	const resultsElements = data.results.map(obj => {
        		if (obj.content_type === 'Activity') {
        			return buildActivity(obj)
        		}
        		else {
        			return buildSpace(obj)
        		}
        	}).join('')

        	$('#search_results').html(`<div class="heading">Results for ${searchQuery}</div>${resultsElements}`)
        },
        error: function(error) {
          console.log('API error', error);
        }
      })
    }, 500))

    // switching tabs
    $('#lookup_tab_btn').click(function(e) {
      $('#save_tab_btn').removeClass('active')
      $('#lookup_tab_btn').addClass('active')

      $('#save_tab').addClass('hidden')
      $('#lookup_tab').removeClass('hidden')
    })

    $('#save_tab_btn').click(function(e) {
      $('#lookup_tab_btn').removeClass('active')
      $('#save_tab_btn').addClass('active')

      $('#lookup_tab').addClass('hidden')
      $('#save_tab').removeClass('hidden')
    })


    // custom selection for Slack
    $('#add_slack_selection').click(function() {
      sendMsgToContentScript({addSelection: true})

      $('#add_slack_selection').addClass('hidden')
      $('#cancel_slack_selection').removeClass('hidden')
    })

    $('#cancel_slack_selection').click(function() {
      sendMsgToContentScript({ cancelSelection: true })

      $('#cancel_slack_selection').addClass('hidden')
      $('#add_slack_selection').removeClass('hidden')
    })


    // custom selection for Reddit
    $('#add_reddit_selection').click(function() {
      sendMsgToContentScript({addSelection: true})

      $('#add_reddit_selection').addClass('hidden')
      $('#cancel_reddit_selection').removeClass('hidden')
    })

    $('#cancel_reddit_selection').click(function() {
      sendMsgToContentScript({ cancelSelection: true })

      $('#cancel_reddit_selection').addClass('hidden')
      $('#add_reddit_selection').removeClass('hidden')
    })



    // $(document).ready(function () {
    //   $("#add_to_field").tokenInput("http://127.0.0.1:8000/search", {
    //     propertyToSearch: 'title'
    //   });
    // });

    // requesting additional permission for storage
    $('#req_storage_permission').click(function(e) {
      chrome.permissions.request({
        permissions: ['storage']
      }, function(granted) {
        if (granted) {
          // console.log('storage permission granted')
          $('#permission_bar').html('Please re-open this extension')
        }
        else {
          console.log('storage permission not granted')
        }
      })
    })
  })
})();
