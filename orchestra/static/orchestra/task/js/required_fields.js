(function() {
  'use strict';

  /**
   * Service to keep track of all required fields in a task view and
   * validate them on submit.
   */
  angular.module('orchestra.task')
  .factory('requiredFields', function($rootScope, orchestraService) {
    var requiredFields = {
      validators: {
        'input-checkbox': [
          function(elem) {
            return elem.checked;
          }
        ],
        'input-text': [
          function(elem) {
            return elem.value && elem.value.length > 0;
          }
        ],
      },
      setup: function(data) {
        /**
         * Sets up the base data on which to validate fields.
         */
        this.fields = {};
        this.invalid = [];
        this.data = data;
      },
      require: function(fieldType, field) {
        /**
         * Sets a field as required. Fields are HTML elements to be
         * checked by one or more validators according to their field
         * type.
         */
        if (this.fields[fieldType] === undefined) {
          this.fields[fieldType] = [field];
        } else {
          this.fields[fieldType].push(field);
        }
      },
      validate: function() {
        /**
         * Validates required fields according to their registered
         * validators.
         */
        var requiredFields = this;
        requiredFields.invalid = [];

        /*jshint -W083 */
        // Hide error for creating a function in a loop
        for (var fieldType in requiredFields.fields) {
          var validators = requiredFields.validators[fieldType];
          if (!validators) {
            console.error('Validators not found for field type:' + fieldType);
            continue;
          }
          var fields = requiredFields.fields[fieldType];
          fields.forEach(function(field) {
            var success = true;
            validators.forEach(function(validator) {
              success = success && validator(field);
            });
            if (!success) {
              requiredFields.invalid.push(field);
            }
          });
        }
        $rootScope.$broadcast('orchestra:task:validatedFields');
        return requiredFields.invalid.length === 0;
      },
      registerValidator: function(fieldType, validator) {
        /**
         * Register a validator function to the given field type.
         */
        var requiredFields = this;
        if (requiredFields.validators[fieldType] === undefined) {
          requiredFields.validators[fieldType].push(validator);
        } else {
          requiredFields.validators[fieldType] = [validator];
        }
      }
    };

    orchestraService.signals.registerSignal(
      'submit.before', function() {
        if (!requiredFields.validate()) {
          alert('One or more required fields have not been filled out.');
          return false;
        }
      });

    return requiredFields;
  });

  /**
   * Provides a directive to wrap required fields in task views.
   *   - The wrapped HTML should contain an input element bound with
   *     ngModel.
   *   - Optionally provide a class to add to the directive wrapper on
   *     error with `data-error-class="error-class"` on the directive
   *     element; otherwise, a default is provided for the input type.
   */
  angular.module('orchestra.task')
  .directive('orchestraRequiredField', function($compile, requiredFields) {
      return {
        restrict: 'EA',
        link: function(scope, elem, attrs) {
          var field = elem.find('input')[0];
          var errorClass = elem.attr('data-error-class');
          if (!errorClass) {
            errorClass = field.getAttribute('type') + '-error';
          }
          if (field &&
            field.getAttribute('type') != 'checkbox' &&
            field.getAttribute('type') != 'text') {
            console.error('Unsupported required field type.');
            return;
          }
          requiredFields.require('input-' + field.getAttribute('type'), field);
          var toggleError = function() {
            if (requiredFields.invalid.indexOf(field) >= 0) {
              elem.addClass('required-field-error ' + errorClass);
            } else {
              elem.removeClass('required-field-error ' + errorClass);
            }
          };
          toggleError();
          scope.$on('orchestra:task:validatedFields', toggleError);
        }
      };
    });

})();
