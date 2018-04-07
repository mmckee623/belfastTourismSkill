'use strict'

var expect = require('chai').expect,  

lambdaToTest = require('./index')


function Context() {
  this.speechResponse = null;
  this.speechError = null;

  this.succeed = function(rsp) {
    this.speechResponse = rsp;
    this.done();
  };

  this.fail = function(rsp) {
    this.speechError = rsp;
    this.done();
  };

}

function validRsp(ctx,options) {
     expect(ctx.speechError).to.be.null;
     expect(ctx.speechResponse.version).to.be.equal('1.0');
     expect(ctx.speechResponse.response).not.to.be.undefined;
     expect(ctx.speechResponse.response.outputSpeech).not.to.be.undefined;
     expect(ctx.speechResponse.response.outputSpeech.type).to.be.equal('SSML');
     expect(ctx.speechResponse.response.outputSpeech.ssml).not.to.be.undefined;
     expect(ctx.speechResponse.response.outputSpeech.ssml).to.match(/<speak>.*<\/speak>/);
     if(options.endSession) {
       expect(ctx.speechResponse.response.shouldEndSession).to.be.true;
       expect(ctx.speechResponse.response.reprompt).to.be.undefined;
     } else {
       expect(ctx.speechResponse.response.shouldEndSession).to.be.false;
       expect(ctx.speechResponse.response.reprompt.outputSpeech).to.be.not.undefined;
       expect(ctx.speechResponse.response.reprompt.outputSpeech.type).to.be.equal('SSML');
       expect(ctx.speechResponse.response.reprompt.outputSpeech.ssml).to.match(/<speak>.*<\/speak>/);
     }

}

function validCard(ctx) {
     expect(ctx.speechResponse.response.card).not.to.be.undefined;
     expect(ctx.speechResponse.response.card.type).to.be.equal('Simple');
     expect(ctx.speechResponse.response.card.title).not.to.be.undefined;
     expect(ctx.speechResponse.response.card.content).not.to.be.undefined;
}



var event = {
  session: {
    new: false,
    sessionId: 'session1234',
    attributes: {},
    user: {
      userId: 'usrid123'
    },
    application: {
      applicationId: 'amzn1.ask.skill.356e2abd-4717-4193-910d-9ee4ad6f7e8a'
    }
  },
  version: '1.0',
  request: {
    intent: {
      slots: {
        SlotName: {
          name: 'SlotName',
          value: 'slot value'
        }
      },
      name: 'intent name'
    },
    type: 'IntentRequest',
    requestId: 'request5678'
  }
};




describe('All intents', function() {
  var ctx = new Context();
  var storedSession;


  describe('Test LaunchIntent', function() {

      before(function(done) {
        event.request.type = 'LaunchRequest';
        event.request.intent = {};
        event.session.attributes = {};
        ctx.done = done;
        lambdaToTest.handler(event , ctx);
      });


     it('valid response', function() {
       validRsp(ctx,{
         endSession: false,
       });
     });

     it('valid outputSpeech', function() {
       expect(ctx.speechResponse.response.outputSpeech.ssml).to.match(/<speak>Welcome to the newest tourism board in Belfast.*<\/speak>/);
     });
    
     it('valid outputSpeech', function() {
       expect(ctx.speechResponse.response.reprompt.outputSpeech.ssml).to.match(/<speak>For example.*<\/speak>/);
     });

  });

  var expResults = {
    'villa italia': {
      endSession: true,
      searchResults: 1
    },
    'champions': {
      endSession: true,
      searchResults: 0
    }
  };

  for(var key in expResults) {

    describe(`Test GetRestaurantInfo ${key}`, function() {
        var options = expResults[key];
        var testRest = key;


        before(function(done) {
          event.request.intent = {};
          event.session.attributes = {};
          event.request.type = 'IntentRequest';
          event.request.intent.name = 'GetRestaurantInfo';
          event.request.intent.slots = {
            RestaurantItem: {
              name: 'RestaurantItem',
              value: testRest
            }
          };
          ctx.done = done;
          lambdaToTest.handler(event , ctx);
        });

       it('valid response', function() {
         validRsp(ctx, options);
       });

       it('valid card', function() {
         validCard(ctx);
       });


      if(!options.endSession) {
       it('valid reprompt', function() {
         expect(ctx.speechResponse.response.reprompt.outputSpeech.ssml).to.match(/You can say/);
       });
      }

    });

    if (!expResults[key].endSession) {

      describe(`Test GetNextRestaurantIntent ${key}`, function() {
          var options = expResults[key];
          var testRest = key;

          before(function(done) {
            event.request.intent = {};
            event.session.attributes = ctx.speechResponse.sessionAttributes;
            event.request.type = 'IntentRequest';
            event.request.intent.name = 'GetNextRestaurantIntent';
            event.request.intent.slots = {};
            ctx.done = done;
            lambdaToTest.handler(event , ctx);
          });

         it('valid response', function() {
           validRsp(ctx, {endSession: true});
         });



         //it('valid reprompt', function() {
         //  validReprompt(ctx);
         //  //expect(ctx.speechResponse.response.reprompt.outputSpeech.ssml).to.match(/<speak>You.*<\/speak>/);
         //});

      });

      describe(`Test AMAZON.StopIntent ${key}`, function() {
          var options = expResults[key];
          var testRest = key;

          before(function(done) {
            event.request.intent = {};
            event.session.attributes = ctx.speechResponse.sessionAttributes;
            event.request.type = 'IntentRequest';
            event.request.intent.name = 'AMAZON.StopIntent';
            event.request.intent.slots = {};
            ctx.done = done;
            lambdaToTest.handler(event , ctx);
          });

         it('valid response', function() {
           validRsp(ctx, {endSession: true});
         });

         it('valid outputSpeech', function() {
           expect(ctx.speechResponse.response.outputSpeech.ssml).to.match(/Good Bye./);
         });

         //it('valid reprompt', function() {
         //  validReprompt(ctx);
         //  //expect(ctx.speechResponse.response.reprompt.outputSpeech.ssml).to.match(/<speak>You.*<\/speak>/);
         //});

      });


    }
  }

  describe(`Test GetRestaurantInfo empty slot`, function() {

    before(function(done) {
      event.request.intent = {};
      event.session.attributes = {};
      event.request.type = 'IntentRequest';
      event.request.intent.name = 'GetRestaurantInfo';
      event.request.intent.slots = {};
      ctx.done = done;
      lambdaToTest.handler(event , ctx);
    });

   it('valid response', function() {
     validRsp(ctx, {endSession:false});
   });


   it('valid outputSpeech', function() {

   });

   it('valid reprompt', function() {

   });

});



});



