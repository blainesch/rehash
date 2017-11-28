import HashRepository from './hashRepository'

export default class Store {
  constructor(shape, hashRepository) {
    if (shape === undefined || shape === null) {
      throw new Error('A shape for the store must be provided')
    }

    this.listeners = []
    this.shape = shape
    this.repo = hashRepository || new HashRepository(Object.keys(shape))
  }

  subscribe(func) {
    this.listeners.push(func)

    return this.listeners.length - 1
  }

  unsubscribe(id) {
    if (!this.listeners[id]) {
      return false
    }

    delete this.listeners[id]
    return true
  }

  defineActions(actions) {
    if (!actions) {
      throw new Error('not yet implemented')
    }

    const boundActions = {}

    Object.entries(actions).forEach(([key, reducer]) => {
      boundActions[key] = this._bindAction(key, reducer)
    })

    return boundActions
  }

  getState(key) {
    if (key) {
      if (!this.shape[key]) {
        return null
      } else {
        return this._get(key)
      }
    }

    return Object.keys(this.shape).reduce((acc, next) => {
      acc[next] = this._get(next)
      return acc
    }, {})
  }

  setState(newState) {
    if (!newState) {
      return
    }

    const serializedHash = Object.keys(newState).reduce((acc, key) => {
      acc[key] = this._serialize(key, newState[key])
      return acc
    }, {})

    this.repo.set(serializedHash)
    this._notify()
  }

  _bindAction(key, reducer) {
    return payload => {
      this.setState(reducer(this.getState(), payload))
    }
  }

  _notify() {
    const state = this.getState()
    this.listeners.forEach(f => f(state))
  }

  _get(key) {
    const serializer = this.shape[key]

    if (!serializer) {
      throw new Error(`No serializer registered for key ${key}`)
    }

    const value = this.repo.get(key)

    if (value === undefined || value === null) {
      return null
    }

    const deserializedValue = serializer.deserialize(value)

    return deserializedValue === undefined || deserializedValue === null
      ? null
      : deserializedValue
  }

  _serialize(key, value) {
    if (value === undefined || value === null) {
      return
    }

    const serializer = this.shape[key]

    if (!serializer) {
      throw new Error(`No serializer registered for key ${key}`)
    }

    return serializer.serialize(value)
  }
}
