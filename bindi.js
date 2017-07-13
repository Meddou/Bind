var bindi = new function()
{
  var BINDI_HTML_VALUE = "html";
  var BINDI_LOADED = "bi-loaded";
  var BINDI_NAME = "bi-name";
  var BINDI_ATTR = "bi";
  var BINDI_AS = "bi-as";
  var INTERPOLATION_START_TOKEN = "%";
  var INTERPOLATION_END_TOKEN = "%";
  var LIST_SEPARATOR_TOKEN = " ";
  var BINDI_DEF_VALUE_TOKEN = ":";
  var BINDI_INTERPOLATION_REGEX_START = '[' + INTERPOLATION_START_TOKEN + '](';
  var BINDI_INTERPOLATION_REGEX_END = ')('  + BINDI_DEF_VALUE_TOKEN + '([^' + INTERPOLATION_END_TOKEN + ']*))?[' + INTERPOLATION_END_TOKEN + ']';

  var registerListeners = [];
  var preRenderListeners = [];
  var postRenderListeners = [];
  var cloneListeners = [];
  var bindListeners = [];

  var self = this;

  var componentModelId= 0;

  this.ComponentModel = function(e)
  {
    this.id = ++componentModelId;
    this.element = e;
  };
  /** --interface
  * {
  *   componentName: [
  *     {
  *       elements: [<componentModel>],
  *       model: <ShadowElement>
  *     }
  *   ]
  * }
  *
  */
  var components = {};
  var componentsList = [];
  var bindiAttributes = [];

  this.getComponents = function()
  {
    return (components);
  }

  this.clearComponents = function()
  {
    components = {};
  }

  this.remove = function(name)
  {
    for (var i = 0; i < components[name].elements.length; i++)
    {
      components[name].elements[i].element.remove();
    }
    components[name].elements = [];
  }

  this.contains = function(element)
  {
    for (var i = 0; i < componentsList.length; i++)
      {
        if (componentsList[i].element == element)
        {
          return (true);
        }
      }
    return (false);
  }

  this.addAttribute = function(attribute)
  {
    for (var i = 0; i < bindiAttributes.length; i++)
    {
      if (bindiAttributes[i] == attribute)
        return ;
    }
    bindiAttributes.push(attribute);
  }

  this.addComponentToCollection = function(name, component)
  {
    var newComponent = new this.ComponentModel(component);
    if (!this.contains(component))
    {
      components[name].elements.push(newComponent);
      componentsList.push(newComponent);
    }
  }

  this.getElementIndex = function(element)
  {
    var k = 0;
    var elem = element;
    while(elem.previousElementSibling)
    {
      k++;
      elem = elem.previousElementSibling;
    }
    return k;
  }

  this.insertElementAfterModel = function(collection, name, element)
  {
    var elem = collection.model.element;

    for (var i = 0; i < collection.elements.length; i++)
      elem = elem.nextElementSibling;
    elem.insertAdjacentElement('afterend', element);

  }

  this.insertElementAtIndex = function(collection, element)
  {
    var parent = collection.parent;
    var index = collection.index;
    if (!index) index = 0;
    if (index >= parent.children.length)
    {
      parent.appendChild(element);
    } else {
    parent.insertBefore(element, parent.children[index + collection.elements.length]);
  }
}

  this.cloneNode = function(element, param)
  {
    return (element.cloneNode(param));
  }

  this.onPreRender = function(onPreRender)
  {
    preRenderListeners.push(onPreRender);
  }

  this.notifyPreRenderSubscribers = function(tagName, variableName, variableValue)
  {
    for (var i = 0; i < preRenderListeners.length; i++)
      variableValue = preRenderListeners[i](tagName, variableName, variableValue);
    return (variableValue);
  }

  this.onRegister = function(onRegister)
  {
    registerListeners.push(onRegister);
  }

  this.notifyRegisterSubscribers = function(name, component, model, element)
  {
    for (var i = 0; i < registerListeners.length; i++)
      registerListeners[i](name, component, model, self);
  }

  this.onClone = function(onClone)
  {
    cloneListeners.push(onClone);
  }

  this.notifyCloneSubscribers = function(component)
  {
    for (var i = 0; i < cloneListeners.length; i++)
      cloneListeners[i](component, self);
  }

  this.onBind = function(onBind)
  {
    bindListeners.push(onBind);
  }

  this.notifyBindSubscribers = function(element)
  {
    for (var i = 0; i < bindListeners.length; i++)
      bindListeners[i](element, self);
  }


  this.registerComponent = function(name, element)
  {
    var model = new this.ComponentModel(element);
    var component = this.cloneModelFromModel(model);
    // var component = new this.ComponentModel(this.cloneNode(element, true));

    if (!components.hasOwnProperty(name))
    {
      this.notifyRegisterSubscribers(name, component, model);
      components[name] = {
        model: model,
        elements: []
      };
    }
    if (this.bindComponentWithDefault(component.element) > 0)
    {
      this.insertElementAfterModel(components[name], name, component.element);
      component.element.setAttribute(BINDI_LOADED, true);
      components[name].elements.push(component);
      componentsList.push(component.element);
    }
  }

  this.foreachJson = function(obj, fx)
  {
    for (var key in obj)
    {
      if (obj.hasOwnProperty(key))
      {
        fx(key, obj[key]);
      }
    }
  }

  this.escapeBinding = function(str)
  {
    return str.replace('%', '%%');
  }

  var getBinding = function(str)
  {
    if (str === undefined) str = "\\w+";
    return (new RegExp(BINDI_INTERPOLATION_REGEX_START + str + BINDI_INTERPOLATION_REGEX_END));
  }

  this.replaceBinding = function(element, tagName, variableName, variableValue, bindings)
  {
    var oldVariableValue = variableValue;

    variableValue = this.notifyPreRenderSubscribers(tagName, variableName, variableValue);
    if (tagName != BINDI_HTML_VALUE)
      element.setAttribute(tagName, element.getAttribute(tagName).replace(bindings, variableValue));
    else
    {
      element.textContent = element.textContent.replace(bindings, variableValue);
    }
    return (oldVariableValue == variableValue ? 0 : 1);
  }

  this.bindAttributes = function(component, data)
  {
    var str;
    var attr = component.getAttribute(BINDI_ATTR);
    var attrValue;
    var matches;
    var occurences = 0;

    if (attr && attr != "")
      attr = attr.split(LIST_SEPARATOR_TOKEN);
    else
      attr = [];
    attr = attr.concat(bindiAttributes);
    if (attr.length > 0)
    {
      if (data !== undefined)
      {
        this.foreachJson(data, function(key, value)
        {
          for (var i = 0; i < attr.length; i++)
          {
            if (attr[i] == BINDI_HTML_VALUE)
              occurences += self.bindText(component, data);
            else
            {
              attrValue = component.getAttribute(attr[i]);
              if (attrValue != null && (matches = attrValue.match(getBinding(key))) !== null)
              {
                occurences += self.replaceBinding(component, attr[i], key, value, matches[0]);
              }
            }
          }
        });
      }
      else
      {
        for (var i = 0; i < attr.length; i++)
        {
          if (attr[i] == BINDI_HTML_VALUE)
            occurences += self.bindText(component, undefined);
          else
          {
            attrValue = component.getAttribute(attr[i]);
            while (attrValue !== null && (matches = attrValue.match(getBinding())) !== null)
              {
                if (matches[matches.length - 1])
                {
                  ++occurences;
                  str = matches[matches.length - 1];
                }
                else
                  str = '';
                occurences += self.replaceBinding(component, attr[i], matches[1], str, matches[0]);
                attrValue = component.getAttribute(attr[i]);
              }
          }
        }
      }
    }
    return (occurences);
  }

  this.bindText = function(component, data)
  {
    var str;
    var occurences = 0;
    var matches;


      if (data !== undefined)
      {
        this.foreachJson(data, function(key, value)
        {
          if ((matches = component.textContent.match(getBinding(key))) !== null)
            occurences += self.replaceBinding(component, BINDI_HTML_VALUE, key, value, matches[0]);
        });
      }
      else
      {
        while ((matches = component.textContent.match(getBinding())) !== null)
          {
            if (matches[matches.length - 1])
            {
              ++occurences;
              str = matches[matches.length - 1];
            }
            else
              str = '';
            occurences += self.replaceBinding(component, BINDI_HTML_VALUE, matches[1], str, matches[0]);
          }
      }
    component.setAttribute(BINDI_LOADED, true);
    return (occurences);
  }

  this.bindComponentWithDefault = function(element)
  {
    var occurences = 0;
    var occurencesElement = 0;

    for (var i = 0; i < element.children.length; i++)
      occurences += this.bindComponentWithDefault(element.children[i]);
    occurencesElement += this.bindAttributes(element, undefined);
    this.attachDataToComponent(element, undefined);
    if (occurencesElement > 0)
      this.notifyBindSubscribers(element);
    return (occurences + occurencesElement);
  }


  this.bindComponentWithData = function(element, data)
  {
    for (var i = 0; i < element.children.length; i++)
      this.bindComponentWithData(element.children[i], data);
    this.bindAttributes(element, data);
    this.bindText(element, data);
    this.attachDataToComponent(element, data);
    this.notifyBindSubscribers(element);
    return (element);
  }

  this.attachDataToComponent = function(element, data)
  {
    element.bindi = data;
  }

  this.cloneModel = function(componentName)
  {
    return (new this.ComponentModel(this.cloneNode(components[componentName].model.element, true)));
  }

  this.cloneModelFromModel = function(model)
  {
    return (new this.ComponentModel(this.cloneNode(model.element, true)));
  }

  this.addFromObject = function(componentName, object)
  {
    newComponent = this.cloneModel(componentName);

    this.bindComponentWithData(newComponent.element, object);
    newComponent.element.setAttribute(BINDI_LOADED, true);
    this.insertElementAfterModel(components[componentName], componentName, newComponent.element);
    this.addComponentToCollection(componentName, newComponent.element);
  }

  this.addFromArray = function(componentName, array)
  {
    for (var i = 0; i < array.length; i++)
      this.addFromObject(componentName, array[i]);
  }

  this.add = function(componentName, data)
  {
    if (data.constructor === Array)
      self.addFromArray(componentName, data);
    else
      self.addFromObject(componentName, data);
  }

  this.update = function(componentName, data)
  {
    this.remove(componentName);
    this.add(componentName, data);
  }

  this.init = function()
  {
    var elements = document.querySelectorAll('[' + BINDI_NAME + ']');

    for (var i = 0; i < elements.length; i++)
    {
      if (!self.contains(elements[i]))
      {
        self.registerComponent(elements[i].getAttribute(BINDI_NAME), elements[i]);
      }
    }
  }

  return (this);
};
