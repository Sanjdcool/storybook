/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/sort-comp */
/* eslint-disable react/button-has-type */
import React, { Component, ReactElement } from 'react';

import { isComponentWillChange } from '../utils/objectTypes';
import * as inputUsageTypes from '../types/inputUsageTypes';

interface JsonValueState {
  value: JsonValueProps['value'];
  name: JsonValueProps['name'];
  keyPath: string[];
  deep: JsonValueProps['deep'];
  editEnabled: boolean;
  inputRef: any;
}

export class JsonValue extends Component<JsonValueProps, JsonValueState> {
  constructor(props: JsonValueProps) {
    super(props);
    const keyPath = [...props.keyPath, props.name];
    this.state = {
      value: props.value,
      name: props.name,
      keyPath,
      deep: props.deep,
      editEnabled: false,
      inputRef: null,
    };

    // Bind
    this.handleEditMode = this.handleEditMode.bind(this);
    this.refInput = this.refInput.bind(this);
    this.handleCancelEdit = this.handleCancelEdit.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
  }

  static getDerivedStateFromProps(props: JsonValueProps, state: JsonValueState) {
    return props.value !== state.value ? { value: props.value } : null;
  }

  componentDidUpdate() {
    const { editEnabled, inputRef, name, value, keyPath, deep } = this.state;
    const { readOnly, dataType } = this.props;
    const isReadOnly = readOnly(name, value, keyPath, deep, dataType);

    if (editEnabled && !isReadOnly && typeof inputRef.focus === 'function') {
      inputRef.focus();
    }
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeydown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeydown);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
    if (event.code === 'Enter' || event.key === 'Enter') {
      event.preventDefault();
      this.handleEdit();
    }
    if (event.code === 'Escape' || event.key === 'Escape') {
      event.preventDefault();
      this.handleCancelEdit();
    }
  }

  handleEdit() {
    const { handleUpdateValue, originalValue, logger, onSubmitValueParser, keyPath } = this.props;
    const { inputRef, name, deep } = this.state;
    if (!inputRef) return;

    const newValue = onSubmitValueParser(true, keyPath, deep, name, inputRef.value);

    const result = {
      value: newValue,
      key: name,
    };

    // Run update
    handleUpdateValue(result)
      .then(() => {
        // Cancel edit mode if necessary
        if (!isComponentWillChange(originalValue, newValue)) {
          this.handleCancelEdit();
        }
      })
      .catch(logger.error);
  }

  handleEditMode() {
    this.setState({
      editEnabled: true,
    });
  }

  refInput(node: any) {
    // @ts-ignore
    this.state.inputRef = node;
  }

  handleCancelEdit() {
    this.setState({
      editEnabled: false,
    });
  }

  render() {
    const { name, value, editEnabled, keyPath, deep } = this.state;
    const {
      handleRemove,
      originalValue,
      readOnly,
      dataType,
      getStyle,
      editButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      minusMenuElement,
      keyPath: comeFromKeyPath,
    } = this.props;

    const style = getStyle(name, originalValue, keyPath, deep, dataType);
    const isReadOnly = readOnly(name, originalValue, keyPath, deep, dataType);
    const isEditing = editEnabled && !isReadOnly;
    const inputElement = inputElementGenerator(
      inputUsageTypes.VALUE,
      comeFromKeyPath,
      deep,
      name,
      originalValue,
      dataType
    );

    const editButtonElementLayout = React.cloneElement(editButtonElement, {
      onClick: this.handleEdit,
    });
    const cancelButtonElementLayout = React.cloneElement(cancelButtonElement, {
      onClick: this.handleCancelEdit,
    });
    const inputElementLayout = React.cloneElement(inputElement, {
      ref: this.refInput,
      defaultValue: JSON.stringify(originalValue),
    });
    const minusMenuLayout = React.cloneElement(minusMenuElement, {
      onClick: handleRemove,
      className: 'rejt-minus-menu',
      style: style.minus,
    });

    return (
      <li className="rejt-value-node" style={style.li}>
        <span className="rejt-name" style={style.name}>
          {name}
          {' : '}
        </span>
        {isEditing ? (
          <span className="rejt-edit-form" style={style.editForm}>
            {inputElementLayout} {cancelButtonElementLayout}
            {editButtonElementLayout}
          </span>
        ) : (
          <span
            className="rejt-value"
            style={style.value}
            onClick={isReadOnly ? null : this.handleEditMode}
          >
            {String(value)}
          </span>
        )}
        {!isReadOnly && !isEditing && minusMenuLayout}
      </li>
    );
  }
}

interface JsonValueProps {
  name: string;
  value: any;
  originalValue?: any;
  keyPath?: string[];
  deep?: number;
  handleRemove?: (...args: any) => any;
  handleUpdateValue?: (...args: any) => any;
  readOnly: (...args: any) => any;
  dataType?: string;
  getStyle: (...args: any) => any;
  editButtonElement?: ReactElement;
  cancelButtonElement?: ReactElement;
  inputElementGenerator: (...args: any) => any;
  minusMenuElement?: ReactElement;
  logger: any;
  onSubmitValueParser: (...args: any) => any;
}

// @ts-ignore
JsonValue.defaultProps = {
  keyPath: [],
  deep: 0,
  handleUpdateValue: () => Promise.resolve(),
  editButtonElement: <button>e</button>,
  cancelButtonElement: <button>c</button>,
  minusMenuElement: <span> - </span>,
};
