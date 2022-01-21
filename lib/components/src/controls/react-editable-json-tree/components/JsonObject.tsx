/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { Component, ReactElement } from 'react';

import { JsonNode } from './JsonNode';
import { JsonAddValue } from './JsonAddValue';
import { ADD_DELTA_TYPE, REMOVE_DELTA_TYPE, UPDATE_DELTA_TYPE } from '../types/deltaTypes';

interface JsonObjectState {
  name: string;
  collapsed: ReturnType<JsonObjectProps['isCollapsed']>;
  data: JsonObjectProps['data'];
  keyPath: JsonObjectProps['keyPath'];
  deep: JsonObjectProps['deep'];
  nextDeep: number;
  addFormVisible: boolean;
}

export class JsonObject extends Component<JsonObjectProps, JsonObjectState> {
  constructor(props: JsonObjectProps) {
    super(props);
    const keyPath = props.deep === -1 ? [] : [...props.keyPath, props.name];
    this.state = {
      name: props.name,
      data: props.data,
      keyPath,
      deep: props.deep,
      nextDeep: props.deep + 1,
      collapsed: props.isCollapsed(keyPath, props.deep, props.data),
      addFormVisible: false,
    };

    // Bind
    this.handleCollapseMode = this.handleCollapseMode.bind(this);
    this.handleRemoveValue = this.handleRemoveValue.bind(this);
    this.handleAddMode = this.handleAddMode.bind(this);
    this.handleAddValueAdd = this.handleAddValueAdd.bind(this);
    this.handleAddValueCancel = this.handleAddValueCancel.bind(this);
    this.handleEditValue = this.handleEditValue.bind(this);
    this.onChildUpdate = this.onChildUpdate.bind(this);
    this.renderCollapsed = this.renderCollapsed.bind(this);
    this.renderNotCollapsed = this.renderNotCollapsed.bind(this);
  }

  static getDerivedStateFromProps(props: JsonObjectProps, state: JsonObjectState) {
    return props.data !== state.data ? { data: props.data } : null;
  }

  onChildUpdate(childKey: string, childData: any) {
    const { data, keyPath } = this.state;
    // Update data
    // @ts-ignore
    data[childKey] = childData;
    // Put new data
    this.setState({
      data,
    });
    // Spread
    const { onUpdate } = this.props;
    const size = keyPath.length;
    onUpdate(keyPath[size - 1], data);
  }

  handleAddMode() {
    this.setState({
      addFormVisible: true,
    });
  }

  handleAddValueCancel() {
    this.setState({
      addFormVisible: false,
    });
  }

  handleAddValueAdd({ key, newValue }: any) {
    const { data, keyPath, nextDeep: deep } = this.state;
    const { beforeAddAction, logger } = this.props;

    beforeAddAction(key, keyPath, deep, newValue)
      .then(() => {
        // Update data
        // @ts-ignore
        data[key] = newValue;
        this.setState({
          data,
        });
        // Cancel add to close
        this.handleAddValueCancel();
        // Spread new update
        const { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data);
        // Spread delta update
        onDeltaUpdate({
          type: ADD_DELTA_TYPE,
          keyPath,
          deep,
          key,
          newValue,
        });
      })
      .catch(logger.error);
  }

  handleRemoveValue(key: string) {
    return () => {
      const { beforeRemoveAction, logger } = this.props;
      const { data, keyPath, nextDeep: deep } = this.state;
      // @ts-ignore
      const oldValue = data[key];
      // Before Remove Action
      beforeRemoveAction(key, keyPath, deep, oldValue)
        .then(() => {
          const deltaUpdateResult = {
            keyPath,
            deep,
            key,
            oldValue,
            type: REMOVE_DELTA_TYPE,
          };

          // @ts-ignore
          delete data[key];
          this.setState({ data });

          // Spread new update
          const { onUpdate, onDeltaUpdate } = this.props;
          onUpdate(keyPath[keyPath.length - 1], data);
          // Spread delta update
          onDeltaUpdate(deltaUpdateResult);
        })
        .catch(logger.error);
    };
  }

  handleCollapseMode() {
    this.setState((state) => ({
      collapsed: !state.collapsed,
    }));
  }

  handleEditValue({ key, value }: any) {
    return new Promise<void>((resolve, reject) => {
      const { beforeUpdateAction } = this.props;
      const { data, keyPath, nextDeep: deep } = this.state;

      // Old value
      // @ts-ignore
      const oldValue = data[key];

      // Before update action
      beforeUpdateAction(key, keyPath, deep, oldValue, value)
        .then(() => {
          // Update value
          // @ts-ignore
          data[key] = value;
          // Set state
          this.setState({
            data,
          });
          // Spread new update
          const { onUpdate, onDeltaUpdate } = this.props;
          onUpdate(keyPath[keyPath.length - 1], data);
          // Spread delta update
          onDeltaUpdate({
            type: UPDATE_DELTA_TYPE,
            keyPath,
            deep,
            key,
            newValue: value,
            oldValue,
          });
          // Resolve
          resolve();
        })
        .catch(reject);
    });
  }

  renderCollapsed() {
    const { name, keyPath, deep, data } = this.state;
    const { handleRemove, readOnly, dataType, getStyle, minusMenuElement } = this.props;

    const { minus, collapsed } = getStyle(name, data, keyPath, deep, dataType);
    const keyList = Object.getOwnPropertyNames(data);

    const isReadOnly = readOnly(name, data, keyPath, deep, dataType);

    const removeItemButton = React.cloneElement(minusMenuElement, {
      onClick: handleRemove,
      className: 'rejt-minus-menu',
      style: minus,
    });

    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <span className="rejt-collapsed">
        <span className="rejt-collapsed-text" style={collapsed} onClick={this.handleCollapseMode}>
          {'{...}'} {keyList.length} {keyList.length === 1 ? 'key' : 'keys'}
        </span>
        {!isReadOnly && removeItemButton}
      </span>
    );
    /* eslint-enable */
  }

  renderNotCollapsed() {
    const { name, data, keyPath, deep, nextDeep, addFormVisible } = this.state;
    const {
      isCollapsed,
      handleRemove,
      onDeltaUpdate,
      readOnly,
      getStyle,
      dataType,
      addButtonElement,
      cancelButtonElement,
      editButtonElement,
      inputElementGenerator,
      textareaElementGenerator,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger,
      onSubmitValueParser,
    } = this.props;

    const { minus, plus, addForm, ul, delimiter } = getStyle(name, data, keyPath, deep, dataType);
    const keyList = Object.getOwnPropertyNames(data);

    const isReadOnly = readOnly(name, data, keyPath, deep, dataType);

    const addItemButton = React.cloneElement(plusMenuElement, {
      onClick: this.handleAddMode,
      className: 'rejt-plus-menu',
      style: plus,
    });
    const removeItemButton = React.cloneElement(minusMenuElement, {
      onClick: handleRemove,
      className: 'rejt-minus-menu',
      style: minus,
    });

    const list = keyList.map((key) => (
      <JsonNode
        key={key}
        name={key}
        data={data[key]}
        keyPath={keyPath}
        deep={nextDeep}
        isCollapsed={isCollapsed}
        handleRemove={this.handleRemoveValue(key)}
        handleUpdateValue={this.handleEditValue}
        onUpdate={this.onChildUpdate}
        onDeltaUpdate={onDeltaUpdate}
        readOnly={readOnly}
        getStyle={getStyle}
        addButtonElement={addButtonElement}
        cancelButtonElement={cancelButtonElement}
        editButtonElement={editButtonElement}
        inputElementGenerator={inputElementGenerator}
        textareaElementGenerator={textareaElementGenerator}
        minusMenuElement={minusMenuElement}
        plusMenuElement={plusMenuElement}
        beforeRemoveAction={beforeRemoveAction}
        beforeAddAction={beforeAddAction}
        beforeUpdateAction={beforeUpdateAction}
        logger={logger}
        onSubmitValueParser={onSubmitValueParser}
      />
    ));

    const startObject = '{';
    const endObject = '}';

    return (
      <span className="rejt-not-collapsed">
        <span className="rejt-not-collapsed-delimiter" style={delimiter}>
          {startObject}
        </span>
        {!isReadOnly && addItemButton}
        <ul className="rejt-not-collapsed-list" style={ul}>
          {list}
        </ul>
        {!isReadOnly && addFormVisible && (
          <div className="rejt-add-form" style={addForm}>
            <JsonAddValue
              handleAdd={this.handleAddValueAdd}
              handleCancel={this.handleAddValueCancel}
              addButtonElement={addButtonElement}
              cancelButtonElement={cancelButtonElement}
              inputElementGenerator={inputElementGenerator}
              keyPath={keyPath}
              deep={deep}
              onSubmitValueParser={onSubmitValueParser}
            />
          </div>
        )}
        <span className="rejt-not-collapsed-delimiter" style={delimiter}>
          {endObject}
        </span>
        {!isReadOnly && removeItemButton}
      </span>
    );
  }

  render() {
    const { name, collapsed, data, keyPath, deep } = this.state;
    const { getStyle, dataType } = this.props;
    const value = collapsed ? this.renderCollapsed() : this.renderNotCollapsed();
    const style = getStyle(name, data, keyPath, deep, dataType);

    /* eslint-disable jsx-a11y/no-static-element-interactions */
    return (
      <div className="rejt-object-node">
        <span onClick={this.handleCollapseMode}>
          <span className="rejt-name" style={style.name}>
            {name} :{' '}
          </span>
        </span>
        {value}
      </div>
    );
    /* eslint-enable */
  }
}

interface JsonObjectProps {
  data: Record<string, any>;
  name: string;
  isCollapsed: (...args: any) => any;
  keyPath?: string[];
  deep?: number;
  handleRemove?: (...args: any) => any;
  onUpdate: (...args: any) => any;
  onDeltaUpdate: (...args: any) => any;
  readOnly: (...args: any) => any;
  dataType?: string;
  getStyle: (...args: any) => any;
  addButtonElement?: ReactElement;
  cancelButtonElement?: ReactElement;
  editButtonElement?: ReactElement;
  inputElementGenerator: (...args: any) => any;
  textareaElementGenerator: (...args: any) => any;
  minusMenuElement?: ReactElement;
  plusMenuElement?: ReactElement;
  beforeRemoveAction?: (...args: any) => any;
  beforeAddAction?: (...args: any) => any;
  beforeUpdateAction?: (...args: any) => any;
  logger: any;
  onSubmitValueParser: (...args: any) => any;
}

// @ts-ignore
JsonObject.defaultProps = {
  keyPath: [],
  deep: 0,
  minusMenuElement: <span> - </span>,
  plusMenuElement: <span> + </span>,
};
