import React, { useRef } from 'react';
import { StyleProp, TextStyle, Animated, Text, ViewStyle } from 'react-native';
import styles from './WheelPicker.styles';
import _ from 'lodash';

export type ItemInformation = {
  option: any,
  index: number,
  column: number,
  numColumns: number,
  visibleRest: number,
  height: number,
  changed?: boolean,
  debug?: boolean,
}

interface ItemProps {
  textStyle: StyleProp<TextStyle>;
  style: StyleProp<ViewStyle>;
  option: any;
  height: number;
  index: number;
  column: number;
  numColumns: number;
  currentScrollIndex: Animated.AnimatedAddition;
  visibleRest: number;
  animationManager: any;
  rotationFunction?: (x: number, info: ItemInformation) => number;
  opacityFunction?: (x: number, info: ItemInformation) => number;
  scaleFunction?: (x: number, info: ItemInformation) => number;
  translateFunction?: (x: number, info: ItemInformation) => number;
  children: Array<React.ElementType>;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only" | undefined;
  debug?: boolean;
}

const WheelPickerItem: React.FC<ItemProps> = ({
  textStyle,
  style,
  height,
  option,
  index,
  column,
  numColumns = 1,
  visibleRest,
  currentScrollIndex,
  animationManager,
  opacityFunction,
  rotationFunction,
  scaleFunction,
  translateFunction,
  children,
  debug = false,
  pointerEvents = 'box-none',
}) => {
  const indexInColumn = Math.floor(index / numColumns);
  const relativeScrollIndex = Animated.subtract(indexInColumn, currentScrollIndex);
  const info: ItemInformation = {column, index, option, numColumns, visibleRest, debug, height};
  const data = useRef<any>({}).current;
  const PAD = 2;

  data.lastIndex = data.index;
  data.index = index;
  data.changed = data.lastIndex !== undefined && data.index !== data.lastIndex;
  info.changed = data.changed;

  if (data.changed) {
    if (debug) console.log('+++', 'index changed from ', data.lastIndex, 'to', data.index);
  }
  
  const {translateX, translateY, opacity, scale, rotateX} = animationManager.get(relativeScrollIndex, info);
  const child = children || <Text style={textStyle}>{option}</Text>;
  const debugStyle = debug && {borderWidth: 1, borderColor: 'white'};

  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        styles.option,
        style,
        debugStyle,
        { height, opacity, transform: [{ translateX }, { translateY }, { rotateX }, { scale }] }
      ]}
    >
      {child}
      {debug && (<Text style={{color: 'white', position: 'absolute', bottom: 0}}>{index}</Text>)}
    </Animated.View>
  );
};

export default React.memo(
  WheelPickerItem,
  /**
   * We enforce that this component will not rerender after the initial render.
   * Therefore props that change on every render like style objects or functions
   * do not need to be wrapped into useMemo and useCallback.
   */
  (prevProps: any, nextProps: any) => {
    const same = (prevProps.debug === nextProps.debug &&
        prevProps.index === nextProps.index &&
        prevProps.column === nextProps.column &&
        prevProps.numColumns === nextProps.numColumns &&
        prevProps.visibleRest === nextProps.visibleRest &&
        _.isEqual(prevProps.option, nextProps.option));
    return same;
  },
);
