// This is template files for developing Alexa skills

'use strict';

var winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ prettyPrint: true, timestamp: true, json: false, stderrLevels:['error']})
    ]
  });

var intentHandlers = {};

if(process.env.NODE_DEBUG_EN) {
  logger.level = 'debug';
}


exports.handler = function (event, context) {
    try {

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

function buildAlexaResponse(response) {
  var alexaResponse = {
    version: '1.0',
    response: {
      outputSpeech: createSpeechObject(response.speechText,response.ssmlEn),
      shouldEndSession: response.shouldEndSession
    }
  };

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

  response.speechText = 'Welcome to the newest tourism board in Belfast. You can discover restaurants by asking me questions. For example, you can say, tell me an italian restaurant';
  response.repromptText = 'For example, you can say, recommend me an asian restaurant.';
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


intentHandlers['GetRestaurantType'] = function(request,session,response,slots) {
  //Intent logic
  //slots.CuisineItem

  if(slots.CuisineType === undefined) {
    response.speechText = 'You forgot to say the type of cuisine you wish to go to. For example, you can say, recommend me a european restaurant. ';
    response.repromptText = 'For example, you can say, tell me about YuGo. ';
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
      response.speechText  += `${item[0]} is located at ${item[1]} and serves ${item[2]} food. Food dishes include, ${item[3]} `; 
      response.cardContent += `'${item[0]}' is located at '${item[1]}' and serves '${item[2]}' food. Food dishes include, '${item[3]}'`;
    });


    if(cuisineResults.length > MAX_RESPONSES) {
      response.speechText += `There are more '${slots.CuisineType}' restaurant results. Say more information to hear about them.  `; 
      response.cardContent += `More restaurants matched your search. Please say more information to discover more great restaurants. Otherwise, say stop if you don't want to hear about them. `; 
      response.repromptText = `You can say more information or stop.`; 
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
      response.speechText  += `${item[0]} is located at ${item[1]} and serves ${item[2]} food. Food dishes include, ${item[3]} `; 
      response.cardContent += `'${item[0]}' is located at '${item[1]}' and serves '${item[2]}' food. Food dishes include, '${item[3]}'`;
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

intentHandlers['GetNextEventIntent'] = function(request,session,response,slots) {

  if(session.attributes.cuisineResults) {
    response.cardTitle = `Other restaurants found: ${session.attributes.CuisineType}`;

    response.speechText  = `Your search resulted in ${session.attributes.resultLength} results.`;
    response.cardContent = `${response.speechText}\n`;


    session.attributes.cuisineResults.forEach(function(item) {
      response.speechText += `Here are your other results. ${item[0]} is located at ${item[1]} and serves ${item[2]} food. Food dishes include, ${item[3]} `; 
      response.cardContent += `'${item[0]}'\n`;
    });
  } else {
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


/*
intentHandlers['GetQuizIntent'] = function(request,session,response,slots) {
  var fruitsDb = require('./fruits_db.json');
  var index = Math.floor(Math.random() * fruitsDb.length);
  response.speechText  = `How many calories in ${fruitsDb[index][0]}. `;
  response.repromptText  = `Please tell number of calories. `;
  session.attributes.fruit = fruitsDb[index];
  response.shouldEndSession = false;
  response.done();
}

intentHandlers['QuizAnswerIntent'] = function(request,session,response,slots) {
  var fruitInfo = session.attributes.fruit;
  var answer = Number(slots.Answer)
  var calories = Number(fruitInfo[1])

  if (calories === answer) {
    response.speechText  = `Correct answer. Congrats. `;
  } else if( Math.abs(calories - answer) < 5 )  {
    response.speechText  = `You are pretty close. ${fruitInfo[0]} contains ${fruitInfo[1]} calories. `;
  } else {
    response.speechText  = `Wrong answer. ${fruitInfo[0]} contains ${fruitInfo[1]} calories. `;
  }
  response.shouldEndSession = true;
  response.done();
}
*/

intentHandlers['DontKnowIntent'] = function(request,session,response,slots) {
  var fruitInfo = session.attributes.fruit;
  var calories = Number(fruitInfo[1])

  response.speechText  = `No problem. ${fruitInfo[0]} contains ${fruitInfo[1]} calories. `;
  response.shouldEndSession = true;
  response.done();
}


function searchCuisineType(rDb, CuisineType) {
  CuisineType = CuisineType.toLowerCase();
  CuisineType = CuisineType.replace(/,/g, '');
  var CuisineWords = CuisineType.split(/\s+/);
  var regExps = []
  var CuisineSearchResult = []


  CuisineWords.forEach(function(cWord) {
    regExps.push(new RegExp(`^${cWord}(es|s)?\\b`));
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
  RestaurantItem = RestaurantItem.replace(/,/g, '');
  var RestaurantWords = RestaurantItem.split(/\s+/);
  var regExps = []
  var RestaurantSearchResult = []


  RestaurantWords.forEach(function(rWord) {
    regExps.push(new RegExp(`^${rWord}(es|s)?\\b`));
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





