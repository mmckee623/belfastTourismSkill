//Build logic. Response formatting.

// Strict Mode used within JS. Eg. the use of undeclared variables not allowed.
'use strict';

//Logger module used for debugging of the application.
var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ prettyPrint: true, timestamp: true, json: false, stderrLevels:['error']})
    ]
  });

//Used to hold all of the intents.
var intentHandlers = {};

if(process.env.NODE_DEBUG_EN) {
  logger.level = 'debug';
}

//Try & Ctch used here to catch any exceptions
exports.handler = function (event, context) {
    try {
			//Getting the APP ID and checking the APP ID Is valid
        logger.info('event.session.application.applicationId=' + event.session.application.applicationId);

        if (APP_ID !== '' && event.session.application.applicationId !== APP_ID) {
            context.fail('Invalid Application ID');
         }
      
        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        logger.debug('Incoming request:\n', JSON.stringify(event,null,2));

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

			//On Launch this function is called. The speech text is spoken to the user. Text is outputted on device such as ipad. 
			//Launch called other the intent request is called.
        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request, event.session, new Response(context,event.session));
        } else if (event.request.type === 'IntentRequest') {
            var response =  new Response(context,event.session);
            if (event.request.intent.name in intentHandlers) {
              intentHandlers[event.request.intent.name](event.request, event.session, response,getSlots(event.request));
            } else {
              response.speechText = 'Unknown intent';
              response.shouldEndSession = true;
              response.done();
            }
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail('Exception: ' + getError(e));
    }
};

function getSlots(req) {
  var slots = {}
  for(var key in req.intent.slots) {
    if(req.intent.slots[key].value !== undefined) {
      slots[key] = req.intent.slots[key].value;
    }
  }
  return slots;
}

// Handles the response. It deals with reqest, session starting and gathering a response by getSlots.
var Response = function (context,session) {
  this.speechText = '';
  this.shouldEndSession = true;
  this.ssmlEn = true;
  this._context = context;
  this._session = session;

  this.done = function(options) {

    if(options && options.speechText) {
      this.speechText = options.speechText;
    }

    if(options && options.repromptText) {
      this.repromptText = options.repromptText;
    }

    if(options && options.ssmlEn) {
      this.ssmlEn = options.ssmlEn;
    }

    if(options && options.shouldEndSession) {
      this.shouldEndSession = options.shouldEndSession;
    }

    this._context.succeed(buildAlexaResponse(this));
  }

  this.fail = function(msg) {
    logger.error(msg);
    this._context.fail(msg);
  }

};

//Functions which takes the text based upon ssml enabled.
function createSpeechObject(text,ssmlEn) {
  if(ssmlEn) {
    return {
      type: 'SSML',
      ssml: '<speak>'+text+'</speak>'
    }
  } else {
    return {
      type: 'PlainText',
      text: text
    }
  }
}

// Outputs speeh and text
function buildAlexaResponse(response) {
  var alexaResponse = {
    version: '1.0',
    response: {
      outputSpeech: createSpeechObject(response.speechText,response.ssmlEn),
      shouldEndSession: response.shouldEndSession
    }
  };
	// re prompt if not anwered.
  if(response.repromptText) {
    alexaResponse.response.reprompt = {
      outputSpeech: createSpeechObject(response.repromptText,response.ssmlEn)
    };
  }

  if(response.cardTitle) {
    alexaResponse.response.card = {
      type: 'Simple',
      title: response.cardTitle
    };

    if(response.imageUrl) {
      alexaResponse.response.card.type = 'Standard';
      alexaResponse.response.card.text = response.cardContent;
      alexaResponse.response.card.image = {
        smallImageUrl: response.imageUrl,
        largeImageUrl: response.imageUrl
      };
    } else {
      alexaResponse.response.card.content = response.cardContent;
    }
  }

  if (!response.shouldEndSession && response._session && response._session.attributes) {
    alexaResponse.sessionAttributes = response._session.attributes;
  }
  logger.debug('Final response:\n', JSON.stringify(alexaResponse,null,2));
  return alexaResponse;
}

function getError(err) {
  var msg='';
  if (typeof err === 'object') {
    if (err.message) {
      msg = ': Message : ' + err.message;
    }
    if (err.stack) {
      msg += '\nStacktrace:';
      msg += '\n====================\n';
      msg += err.stack;
    }
  } else {
    msg = err;
    msg += ' - This error is not object';
  }
  return msg;
}


//--------------------------------------------- Skill specific logic starts here ----------------------------------------- 

//Add your skill application ID from amazon devloper portal
var APP_ID = 'amzn1.ask.skill.356e2abd-4717-4193-910d-9ee4ad6f7e8a';

function onSessionStarted(sessionStartedRequest, session) {
    logger.debug('onSessionStarted requestId=' + sessionStartedRequest.requestId + ', sessionId=' + session.sessionId);
    // add any session init logic here
    
}

function onSessionEnded(sessionEndedRequest, session) {
  logger.debug('onSessionEnded requestId=' + sessionEndedRequest.requestId + ', sessionId=' + session.sessionId);
  // Add any cleanup logic here
  
}

function onLaunch(launchRequest, session, response) {
  logger.debug('onLaunch requestId=' + launchRequest.requestId + ', sessionId=' + session.sessionId);

  response.speechText = 'Welcome to the newest tourism board in Belfast. You can discover restaurants and nightlife destinations by asking me questions. For example, you can say, tell me an italian restaurant or recommend me a nightclub to go to.';
  response.repromptText = 'For example, you can say, recommend me an italian restaurant or recommend me a nightclub to go to.';
  response.shouldEndSession = false;
  response.done();
}


/** For each intent write a intentHandlers
Example:
intentHandlers['HelloIntent'] = function(request,session,response,slots) {
  //Intent logic
  
}
**/
var MAX_RESPONSES = 1;
var MAX_RESTAURANT_ITEMS = 10;
var MAX_NIGHTLIFE_ITEMS = 5;

intentHandlers['GetRestaurantInfo'] = function(request,session,response,slots) {
  //Intent logic
  //slots.RestaurantItem

  if(slots.RestaurantItem === undefined) {
    response.speechText = 'Looks like you forgot to mention a restaurant name. Which restaurant would you like to find information out about? ';
    response.repromptText = 'For example, you can say, tell me about YuGo. ';
    response.shouldEndSession = false;
    response.done();
    return;
  }

  var restaurantDb = require('./restaurant_db.json');
  var restaurantResults = searchRestaurantInfo(restaurantDb,slots.RestaurantItem);

  response.cardTitle = `Restaurant results for: ${slots.RestaurantItem}`;
  response.cardContent = '';
  
  if(restaurantResults.length==0) {
    response.speechText = `Could not find any ${slots.RestaurantItem} restaurants. Please try a different cuisine. `;
    response.cardContent += response.speechText;
    response.shouldEndSession = true;
    response.done();
  } else {

    restaurantResults.slice(0,MAX_RESPONSES).forEach( function(item) {
      response.speechText  += `${item[0]} is located at ${item[1]} and serves ${item[2]} food. Food dishes include, ${item[3]}. `; 
      response.cardContent += `'${item[0]}' is located at '${item[1]}' and serves '${item[2]}' food. Food dishes include, '${item[3]}'.`;
    });


    if(restaurantResults.length > MAX_RESPONSES) {
      response.speechText += `There are more restaurants called '${slots.RestaurantItem}'. Say more information to hear about them.  `; 
      response.cardContent += `There are more restaurants called '${slots.RestaurantItem}'. You can say more information to discover another great restaurant. Or say stop if you are finished. `; 
      response.repromptText = `You can say more information or stop.`; 
      session.attributes.resultLength = restaurantResults.length;
      session.attributes.RestaurantItem = slots.RestaurantItem;
      session.attributes.restaurantResults = restaurantResults.slice(MAX_RESPONSES,MAX_RESTAURANT_ITEMS);
      response.shouldEndSession = false;
      response.done();

    } else {
      response.shouldEndSession = true;
      response.done();
    }
  }
}

intentHandlers['GetRestaurantType'] = function(request,session,response,slots) {
  //Intent logic
  //slots.CuisineType

  if(slots.CuisineType === undefined) {
    response.speechText = 'You forgot to say the type of cuisine you wish to go to. For example, you can say, recommend me a european restaurant. ';
    response.repromptText = 'For example, you can say, recommend me a european restaurant. ';
    response.shouldEndSession = false;
    response.done();
    return;
  }

  var restaurantDb = require('./restaurant_db.json');
  var cuisineResults = searchCuisineType(restaurantDb,slots.CuisineType);

  response.cardTitle = `Restaurant results for: ${slots.CuisineType}`;
  response.cardContent = '';
  
  if(cuisineResults.length==0) {
    response.speechText = `Could not find any ${slots.CuisineType} restaurants. Please try a different cuisine. `;
    response.cardContent += response.speechText;
    response.shouldEndSession = true;
    response.done();
  } else {

    cuisineResults.slice(0,MAX_RESPONSES).forEach( function(item) {
      response.speechText  += `${item[0]} is located at ${item[1]} and serves ${item[2]} food. Food dishes include, ${item[3]}. `; 
      response.cardContent += `'${item[0]}' is located at '${item[1]}' and serves '${item[2]}' food. Food dishes include, '${item[3]}.'`;
    });


    if(cuisineResults.length > MAX_RESPONSES) {
      response.speechText += `There are more '${slots.CuisineType}' restaurant results. Say 'more restaurants' to hear about them.  `; 
      response.cardContent += `More restaurants matched your search. Please say 'more restaurants' to discover more great restaurants. Otherwise, say stop if you don't want to hear about them. `; 
      response.repromptText = `You can say 'more restaurants' or stop.`; 
      session.attributes.resultLength = cuisineResults.length;
      session.attributes.CuisineType = slots.CuisineType;
      session.attributes.cuisineResults = cuisineResults.slice(MAX_RESPONSES,MAX_RESTAURANT_ITEMS);
      response.shouldEndSession = false;
      response.done();

    } else {
      response.shouldEndSession = true;
      response.done();
    }


  }


}


intentHandlers['GetNightlifeType'] = function(request,session,response,slots) {
  //Intent logic
  //slots.NightlifeType

  if(slots.NightlifeType === undefined) {
    response.speechText = 'You forgot to say whether you want to go to a bar or nightclub. For example, you can say, recommend me a bar. ';
    response.repromptText = 'For example, you can say, recommend me a bar. ';
    response.shouldEndSession = false;
    response.done();
    return;
  }

  var nightlifeDb = require('./nightlife_db.json');
  var nightlifeResults = searchNightlifeType(nightlifeDb,slots.NightlifeType);

  response.cardTitle = `Nightlife results for: ${slots.NightlifeType}`;
  response.cardContent = '';
  
  if(nightlifeResults.length==0) {
    response.speechText = `Could not find any ${slots.NightlifeType} . Please try a different nightlife type. `;
    response.cardContent += response.speechText;
    response.shouldEndSession = true;
    response.done();
  } else {

    nightlifeResults.slice(0,MAX_RESPONSES).forEach( function(item) {
      response.speechText  += `${item[0]} is located at ${item[1]}. ${item[0]} is ${item[3]}. `; 
      response.cardContent += `'${item[0]}' is located at '${item[1]}'. '${item[0]}' is '${item[3]}'. `;
    });


    if(nightlifeResults.length > MAX_RESPONSES) {
      response.speechText += `There are more '${slots.NightlifeType}' results. Say more information to hear about them.  `; 
      response.cardContent += `More '${slots.NightlifeType}' matched your search. Please say more information to discover more great nightlife destinations. Otherwise, say stop if you don't want to hear about them. `; 
      response.repromptText = `You can say more information or stop.`; 
      session.attributes.resultLength = nightlifeResults.length;
      session.attributes.NightlifeType = slots.NightlifeType;
      session.attributes.nightlifeResults = nightlifeResults.slice(MAX_RESPONSES,MAX_NIGHTLIFE_ITEMS);
      response.shouldEndSession = false;
      response.done();

    } else {
      response.shouldEndSession = true;
      response.done();
    }


  }


}

intentHandlers['GetNightlifeMusic'] = function(request,session,response,slots) {
  //Intent logic
  //slots.NightlifeMusic

  if(slots.NightlifeMusic === undefined) {
    response.speechText = 'You forgot to say what type of music you want to listen to. For example, you can say, where plays techno. ';
    response.repromptText = 'For example, you can say, where plays techno. ';
    response.shouldEndSession = false;
    response.done();
    return;
  }

  var nightlifeDb = require('./nightlife_db.json');
  var musicResults = searchNightlifeMusic(nightlifeDb,slots.NightlifeMusic);

  response.cardTitle = `Nightlife results for: ${slots.NightlifeMusic}`;
  response.cardContent = '';
  
  if(musicResults.length==0) {
    response.speechText = `Could not find any ${slots.NightlifeMusic} . Please try a different nightlife type. `;
    response.cardContent += response.speechText;
    response.shouldEndSession = true;
    response.done();
  } else {

    musicResults.slice(0,MAX_RESPONSES).forEach( function(item) {
      response.speechText  += `${item[0]} is located at ${item[1]}. ${item[0]} is ${item[3]}. `; 
      response.cardContent += `'${item[0]}' is located at '${item[1]}'. '${item[0]}' is '${item[3]}'. `;
    });


    if(musicResults.length > MAX_RESPONSES) {
      response.speechText += `There are more '${slots.NightlifeMusic}' results. Say more information to hear about them.  `; 
      response.cardContent += `More '${slots.NightlifeMusic}' matched your search. Please say more information to discover more great nightlife destinations. Otherwise, say stop if you don't want to hear about them. `; 
      response.repromptText = `You can say more information or stop.`; 
      session.attributes.resultLength = musicResults.length;
      session.attributes.NightlifeMusic = slots.NightlifeMusic;
      session.attributes.musicResults = musicResults.slice(MAX_RESPONSES,MAX_NIGHTLIFE_ITEMS);
      response.shouldEndSession = false;
      response.done();

    } else {
      response.shouldEndSession = true;
      response.done();
    }


  }


}

intentHandlers['GetNightlifeDay'] = function(request,session,response,slots) {
  //Intent logic
  //slots.NightlifeDay

  if(slots.NightlifeDay === undefined) {
    response.speechText = 'You forgot to say what day you want to go out. For example, you can say, where is good to go on a Tuesday. ';
    response.repromptText = 'For example, you can say, where is good to go on a Tuesday. ';
    response.shouldEndSession = false;
    response.done();
    return;
  }

  var nightlifeDb = require('./nightlife_db.json');
  var nightlifeDayResults = searchNightlifeDay(nightlifeDb,slots.NightlifeDay);

  response.cardTitle = `Nightlife results for: ${slots.NightlifeDay}`;
  response.cardContent = '';
  
  if(nightlifeDayResults.length==0) {
    response.speechText = `Could not find any ${slots.NightlifeDay} . Please try a different nightlife type. `;
    response.cardContent += response.speechText;
    response.shouldEndSession = true;
    response.done();
  } else {

    nightlifeDayResults.slice(0,MAX_RESPONSES).forEach( function(item) {
      response.speechText  += `${item[0]} is located at ${item[1]}. ${item[0]} is ${item[3]}. `; 
      response.cardContent += `'${item[0]}' is located at '${item[1]}'. '${item[0]}' is '${item[3]}'. `;
    });


    if(nightlifeDayResults.length > MAX_RESPONSES) {
      response.speechText += `There are more '${slots.NightlifeDay}' results. Say more information to hear about them.  `; 
      response.cardContent += `More '${slots.NightlifeDay}' matched your search. Please say more information to discover more great nightlife destinations. Otherwise, say stop if you don't want to hear about them. `; 
      response.repromptText = `You can say more information or stop.`; 
      session.attributes.resultLength = nightlifeDayResults.length;
      session.attributes.NightlifeDay = slots.NightlifeDay;
      session.attributes.nightlifeDayResults = nightlifeDayResults.slice(MAX_RESPONSES,MAX_NIGHTLIFE_ITEMS);
      response.shouldEndSession = false;
      response.done();

    } else {
      response.shouldEndSession = true;
      response.done();
    }


  }


}

intentHandlers['GetNextRestaurantIntent'] = function(request,session,response,slots) {

  if(session.attributes.restaurantResults) {
    response.cardTitle = `Other restaurants found: ${session.attributes.RestaurantItem}`;

    response.speechText  = `Your search resulted in ${session.attributes.resultLength} results.`;
    response.cardContent = `${response.speechText}\n`;


    session.attributes.restaurantResults.forEach(function(item) {
      response.speechText += `Here are your other results. ${item[0]} is located at ${item[1]}. Food dishes include, ${item[3]}. `; 
      response.cardContent += `'${item[0]}'\n`;
    });
  } 
  else {
    response.speechText  = `Wrong invocation of this intent. `;
  }
  response.shouldEndSession = true;
  response.done();

};

intentHandlers['GetNextCuisineIntent'] = function(request,session,response,slots) {

  if(session.attributes.cuisineResults) {
    response.cardTitle = `Other restaurants found: ${session.attributes.CuisineType}`;

    response.speechText  = `Your search resulted in ${session.attributes.resultLength} results.`;
    response.cardContent = `${response.speechText}\n`;


    session.attributes.cuisineResults.forEach(function(item) {
      response.speechText += `Here are your other results. ${item[0]} is located at ${item[1]}. Food dishes include, ${item[3]}. `; 
      response.cardContent += `'${item[0]}'\n`;
    });
  } 
  else {
    response.speechText  = `Wrong invocation of this intent. `;
  }
  response.shouldEndSession = true;
  response.done();

};

intentHandlers['GetNextNightlifeIntent'] = function(request,session,response,slots) {

    if (session.attributes.nightlifeResults) {
    response.cardTitle = `Other restaurants found: ${session.attributes.NightlifeType}`;

    response.speechText  = `Your search resulted in ${session.attributes.resultLength} results.`;
    response.cardContent = `${response.speechText}\n`;


    session.attributes.nightlifeResults.forEach(function(item) {
      response.speechText  += `${item[0]} is located at ${item[1]}. ${item[0]} is ${item[3]}. `; 
      response.cardContent += `'${item[0]}' is located at '${item[1]}'. '${item[0]}' is '${item[3]}'. `;
    });
  } 
  else {
    response.speechText  = `Wrong invocation of this intent. `;
  }
  response.shouldEndSession = true;
  response.done();

};

intentHandlers['GetNextMusicIntent'] = function(request,session,response,slots) {

  if (session.attributes.musicResults) {
  response.cardTitle = `Other restaurants found: ${session.attributes.NightlifeMusic}`;

  response.speechText  = `Your search resulted in ${session.attributes.resultLength} results.`;
  response.cardContent = `${response.speechText}\n`;


  session.attributes.musicResults.forEach(function(item) {
    response.speechText  += `${item[0]} is located at ${item[1]}. ${item[0]} is ${item[3]}. `; 
    response.cardContent += `'${item[0]}' is located at '${item[1]}'. '${item[0]}' is '${item[3]}'. `;
  });
} 
else {
  response.speechText  = `Wrong invocation of this intent. `;
}
response.shouldEndSession = true;
response.done();

};

intentHandlers['GetNextDayIntent'] = function(request,session,response,slots) {

  if (session.attributes.musicResults) {
  response.cardTitle = `Other restaurants found: ${session.attributes.NightlifeDay}`;

  response.speechText  = `Your search resulted in ${session.attributes.resultLength} results.`;
  response.cardContent = `${response.speechText}\n`;


  session.attributes.nightlifeDayResults.forEach(function(item) {
    response.speechText  += `${item[0]} is located at ${item[1]}. ${item[0]} is ${item[3]}. `; 
    response.cardContent += `'${item[0]}' is located at '${item[1]}'. '${item[0]}' is '${item[3]}'. `;
  });
} 
else {
  response.speechText  = `Wrong invocation of this intent. `;
}
response.shouldEndSession = true;
response.done();

};



intentHandlers['AMAZON.StopIntent'] = function(request,session,response,slots) {
  response.speechText  = `Good Bye. `;
  response.shouldEndSession = true;
  response.done();
};

intentHandlers['AMAZON.CancelIntent'] =  intentHandlers['AMAZON.StopIntent'];

intentHandlers['AMAZON.HelpIntent'] = function(request,session,response,slots) {
  response.speechText = "You can ask Nutrition Lookup skill about calorie information of food items. For a given food item, it provides you Calories per 100 grams. For example, you can say butter salted, to know about its Calories per 100 grams. Alternatively, you can also say how many calories in butter salted. If skill not opened you can also say in one shot, Alexa, ask Nutri Lookup about butter salted. Please refer to skill description for all possible sample utterences. Which food calorie information would you like to know?";
  response.repromptText = "Which food calorie information would you like to know? or You can say stop to stop the skill.";
  response.shouldEndSession = false;
  response.done();
}

function searchCuisineType(rDb, CuisineType) {
  CuisineType = CuisineType.toLowerCase();
  var CuisineWords = CuisineType.split();
  var regExps = []
  var CuisineSearchResult = []


  CuisineWords.forEach(function(cWord) {
    regExps.push(new RegExp(`^${cWord}`));
  });

  rDb.forEach( function (item) {
    var match = 1;
    var cuisineFullName = item[2]
    var cWeight = 0;

    CuisineWords.forEach(function(cWord) {
      if(!cuisineFullName.match(cWord)) {
        match = 0;
      }
    });

    if(match==0) {
      return;
    }

    regExps.forEach(function(rExp) {
      if(cuisineFullName.match(rExp)) {
        cWeight += 10;
      }
    });

    if (cuisineFullName.split(/\s+/).length == CuisineWords.length) {
        cWeight += 10;
    }


    CuisineSearchResult.push([item, cWeight]);

  });

  
  var cuisineFinalResult = CuisineSearchResult.filter(function(x){return x[1]>=10});
  if(cuisineFinalResult.length == 0) {
    cuisineFinalResult = CuisineSearchResult;
  } else {
    cuisineFinalResult.sort(function(a, b) {
        return b[1] - a[1];
    });
  }

  cuisineFinalResult = cuisineFinalResult.map(function(x) {
    return x[0]
  });

  return cuisineFinalResult;
}

function searchRestaurantInfo(rDb, RestaurantItem) {
  RestaurantItem = RestaurantItem.toLowerCase();
  var RestaurantWords = RestaurantItem.split();
  var regExps = []
  var RestaurantSearchResult = []


  RestaurantWords.forEach(function(rWord) {
    regExps.push(new RegExp(`^${rWord}`));
  });

  rDb.forEach( function (item) {
    var match = 1;
    var restaurantFullName = item[0]
    var rWeight = 0;

    RestaurantWords.forEach(function(rWord) {
      if(!restaurantFullName.match(rWord)) {
        match = 0;
      }
    });

    if(match==0) {
      return;
    }

    regExps.forEach(function(rExp) {
      if(restaurantFullName.match(rExp)) {
        rWeight += 10;
      }
    });

    if (restaurantFullName.split(/\s+/).length == RestaurantWords.length) {
        rWeight += 10;
    }


    RestaurantSearchResult.push([item, rWeight]);

  });

  
  var restaurantFinalResult = RestaurantSearchResult.filter(function(x){return x[1]>=10});
  if(restaurantFinalResult.length == 0) {
    restaurantFinalResult = RestaurantSearchResult;
  } else {
    restaurantFinalResult.sort(function(a, b) {
        return b[1] - a[1];
    });
  }

  restaurantFinalResult = restaurantFinalResult.map(function(x) {
    return x[0]
  });

  return restaurantFinalResult;
}

function searchNightlifeType(nDb, NightlifeType) {
  NightlifeType = NightlifeType.toLowerCase();
  var NightlifeTypeWords = NightlifeType.split();
  var regExps = []
  var NightlifeTypeSearchResult = []


  NightlifeTypeWords.forEach(function(nWord) {
    regExps.push(new RegExp(`^${nWord}`));
  });

  nDb.forEach( function (item) {
    var match = 1;
    var nightlifeTypeFullName = item[2]
    var nWeight = 0;

    NightlifeTypeWords.forEach(function(nWord) {
      if(!nightlifeTypeFullName.match(nWord)) {
        match = 0;
      }
    });

    if(match==0) {
      return;
    }

    regExps.forEach(function(rExp) {
      if(nightlifeTypeFullName.match(rExp)) {
        nWeight += 10;
      }
    });

    if (nightlifeTypeFullName.split(/\s+/).length == NightlifeTypeWords.length) {
        nWeight += 10;
    }


    NightlifeTypeSearchResult.push([item, nWeight]);

  });

  
  var nightlifeTypeFinalResult = NightlifeTypeSearchResult.filter(function(x){return x[1]>=10});
  if(nightlifeTypeFinalResult.length == 0) {
    nightlifeTypeFinalResult = NightlifeTypeSearchResult;
  } else {
    nightlifeTypeFinalResult.sort(function(a, b) {
        return b[1] - a[1];
    });
  }

  nightlifeTypeFinalResult = nightlifeTypeFinalResult.map(function(x) {
    return x[0]
  });

  return nightlifeTypeFinalResult;
}

function searchNightlifeMusic(nDb, NightlifeMusic) {
  NightlifeMusic = NightlifeMusic.toLowerCase();
  var NightlifeMusicWords = NightlifeMusic.split();
  var regExps = []
  var NightlifeMusicSearchResult = []


  NightlifeMusicWords.forEach(function(mWord) {
    regExps.push(new RegExp(`^${mWord}`));
  });

  nDb.forEach( function (item) {
    var match = 1;
    var NightlifeMusicFullName = item[5]
    var mWeight = 0;

    NightlifeMusicWords.forEach(function(mWord) {
      if(!NightlifeMusicFullName.match(mWord)) {
        match = 0;
      }
    });

    if(match==0) {
      return;
    }

    regExps.forEach(function(rExp) {
      if(NightlifeMusicFullName.match(rExp)) {
        mWeight += 10;
      }
    });

    if (NightlifeMusicFullName.split(/\s+/).length == NightlifeMusicWords.length) {
        mWeight += 10;
    }


    NightlifeMusicSearchResult.push([item, mWeight]);

  });

  
  var NightlifeMusicFinalResult = NightlifeMusicSearchResult.filter(function(x){return x[1]>=10});
  if(NightlifeMusicFinalResult.length == 0) {
    NightlifeMusicFinalResult = NightlifeMusicSearchResult;
  } else {
    NightlifeMusicFinalResult.sort(function(a, b) {
        return b[1] - a[1];
    });
  }

  NightlifeMusicFinalResult = NightlifeMusicFinalResult.map(function(x) {
    return x[0]
  });

  return NightlifeMusicFinalResult;
}

function searchNightlifeDay(nDb, NightlifeDay) {
  NightlifeDay = NightlifeDay.toLowerCase();
  var NightlifeDayWords = NightlifeDay.split();
  var regExps = []
  var NightlifeDaySearchResult = []


  NightlifeDayWords.forEach(function(dWord) {
    regExps.push(new RegExp(`^${dWord}`));
  });

  nDb.forEach( function (item) {
    var match = 1;
    var nightlifeDayFullName = item[4]
    var dWeight = 0;

    NightlifeDayWords.forEach(function(dWord) {
      if(!nightlifeDayFullName.match(dWord)) {
        match = 0;
      }
    });

    if(match==0) {
      return;
    }

    regExps.forEach(function(rExp) {
      if(nightlifeDayFullName.match(rExp)) {
        dWeight += 10;
      }
    });

    if (nightlifeDayFullName.split(/\s+/).length == NightlifeDayWords.length) {
        dWeight += 10;
    }


    NightlifeDaySearchResult.push([item, dWeight]);

  });

  
  var nightlifeDayFinalResult = NightlifeDaySearchResult.filter(function(x){return x[1]>=10});
  if(nightlifeDayFinalResult.length == 0) {
    nightlifeDayFinalResult = NightlifeDaySearchResult;
  } else {
    nightlifeDayFinalResult.sort(function(a, b) {
        return b[1] - a[1];
    });
  }

  nightlifeDayFinalResult = nightlifeDayFinalResult.map(function(x) {
    return x[0]
  });

  return nightlifeDayFinalResult;
}
