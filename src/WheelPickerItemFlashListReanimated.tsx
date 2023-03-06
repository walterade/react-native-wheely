import React, { useRef } from 'react';
import { StyleProp, TextStyle, Text, ViewStyle } from 'react-native';
import Animated, { interpolate, SharedValue, useDerivedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import styles from './WheelPicker.styles';
import _ from 'lodash';

export type ItemInformation = {
  option: any,
  index: number,
  column: number,
  numColumns: number,
  visibleRest: number,
}

interface ItemProps {
  textStyle: StyleProp<TextStyle>;
  style: StyleProp<ViewStyle>;
  option: any;
  height: number;
  index: number;
  column: number;
  numColumns: number;
  currentScrollIndex: SharedValue<number>;
  visibleRest: number;
  rotationFunction: (x: number, info: ItemInformation) => number;
  opacityFunction: (x: number, info: ItemInformation) => number;
  scaleFunction: (x: number, info: ItemInformation) => number;
  translateFunction: (x: number, info: ItemInformation) => number;
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
  opacityFunction,
  rotationFunction,
  scaleFunction,
  translateFunction,
  children,
  debug = false,
  pointerEvents = 'box-none',
}) => {
  const indexInColumn = Math.floor(index / numColumns);
  const relativeScrollIndex = useDerivedValue(() => {
    'worklet';
    return indexInColumn - currentScrollIndex.value;
  }); 
  const info: ItemInformation = {column, index, option, numColumns, visibleRest};
  const data = useRef<any>({}).current;
  const PAD = 2;

  data.lastIndex = data.index;
  data.index = index;
  data.changed = data.lastIndex !== undefined && data.index !== data.lastIndex;

  if (data.changed) {
    if (debug) console.log('+++', 'index changed from ', data.lastIndex, 'to', data.index);
  }

  const interpolateInputRange = (
    () => {
      const range = [0];
      for (let i = 1; i <= visibleRest + 1 + PAD; i++) {
        range.unshift(-i);
        range.push(i);
      }
      return range;
    }
  )();

  const interpolateOutputRange = (func: any, init?: number) => {        
    const range = [init !== undefined ? init : func(0, info)];
    for (let x = 1; x <= visibleRest + 1 + PAD; x++) {
      const y = func(x, info);
      range.unshift(y);
      range.push(y);
    }
    return range;
  };

  const interpolateOutputRangeTranslateY = (() => {
    const range = [0];
    for (let i = 1; i <= visibleRest + 1 + PAD; i++) {
      let y =
        height * (Math.sin(Math.PI / 2 - rotationFunction(i, info))) / 3;
      for (let j = 1; j < i; j++) {
        y += height * (Math.sin(Math.PI / 2 - rotationFunction(j, info))) / 1.2;
      }
      range.unshift(y);
      range.push(-y);
    }
    return range;
  })();

  const interpolateOutputRangeRotateX = interpolateOutputRange(rotationFunction, 0);
  const interpolateOutputRangeTranslateX = interpolateOutputRange(translateFunction);
  const interpolateOutputRangeOpacity = interpolateOutputRange(opacityFunction, 1);
  const interpolateOutputRangeScale = interpolateOutputRange(scaleFunction, 1.0);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const translateX = interpolate(relativeScrollIndex.value,
      interpolateInputRange,
      interpolateOutputRangeTranslateX,
    );

    const translateY = interpolate(relativeScrollIndex.value,
      interpolateInputRange,
      interpolateOutputRangeTranslateY,
    );

    const opacity = interpolate(relativeScrollIndex.value,
      interpolateInputRange,
      interpolateOutputRangeOpacity,
    );

    const scale = interpolate(relativeScrollIndex.value,
      interpolateInputRange,
      interpolateOutputRangeScale,
    );

    const rotateX = interpolate(relativeScrollIndex.value,
      interpolateInputRange,
      interpolateOutputRangeRotateX,
    );

    return {
      opacity,
      transform: [
        { translateX: translateX }, 
        { translateY: translateY },
        { rotateX: `${rotateX}deg` }, 
        { scale: scale },
      ]
    }
  });

  const child = children || <Text style={textStyle}>{option}</Text>;
  const debugStyle = debug && {borderWidth: 1, borderColor: 'white'};

  return (
    <Animated.View
      pointerEvents={pointerEvents}
      style={[
        styles.option,
        style,
        debugStyle,
        { height }, 
        animatedStyle,
      ]}
    >
      {child}
      {debug && (<Text style={{color: 'white'}}>{index}</Text>)}
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
