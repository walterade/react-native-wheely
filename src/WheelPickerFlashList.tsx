import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  StyleProp,
  TextStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ViewStyle,
  View,
  ViewProps,
  Animated,
} from 'react-native';
import styles from './WheelPicker.styles';
import WheelPickerItemFlashList, { ItemInformation } from './WheelPickerItemFlashList';
import _ from 'lodash';
import DeepDiff from 'deep-diff';
import { FlashList, FlashListProps, CellContainer } from '@shopify/flash-list';
import AnimationManager from './AnimationManager';

const d = DeepDiff;
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const AnimatedCellContainer = Animated.createAnimatedComponent(CellContainer);

interface Props {
  selectedIndex: number;
  options: any[];
  onChange: (index: number, selected: boolean) => void;
  onMounted: () => void;
  selectedIndicatorStyle?: StyleProp<ViewStyle>;
  itemTextStyle?: TextStyle;
  itemStyle?: ViewStyle;
  itemHeight?: number;
  containerStyle?: ViewStyle;
  containerProps?: Omit<ViewProps, 'style'>;
  scaleFunction?: (x: number, info: ItemInformation) => number;
  translateFunction?: (x: number, info: ItemInformation) => number;
  rotationFunction?: (x: number, info: ItemInformation) => number;
  opacityFunction?: (x: number, info: ItemInformation) => number;
  decelerationRate?: 'normal' | 'fast' | number;
  flashListProps?: Omit<FlashListProps<unknown>, 'data' | 'renderItem'>;
  renderItem?: (info: any) => any;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => any;
  keyExtractor?: (item: any, index: number) => string;
  headerPadding: boolean;
  footerPadding: boolean;
  debug?: boolean;
}

type WheelPickerRef = {
  setSelectedIndex: (index: number, animated: boolean) => void,
  current: FlashList<any> | null
}

/* eslint-disable react/display-name */
const WheelPicker: React.FC<Props> = React.forwardRef<WheelPickerRef, Props>(({
  selectedIndex,
  options,
  onChange,
  onMounted,
  selectedIndicatorStyle = {},
  containerStyle = {},
  itemStyle = {},
  itemTextStyle = {},
  itemHeight = 40,
  scaleFunction = (x: number) => 1.0 ** x,
  translateFunction = () => 0,
  rotationFunction = (x: number) => 1 - Math.pow(1 / 2, x),
  opacityFunction = (x: number) => Math.pow(1 / 3, x),
  decelerationRate = 'fast',
  containerProps = {},
  flashListProps = {},
  renderItem,
  onScroll,
  keyExtractor = (item: any, index: number) => index.toString(),
  headerPadding = true,
  footerPadding = true,
  debug = false,
}, ref) => {
  const flashListRef = useRef<FlashList<any>>(null);
  const [scrollY] = useState(new Animated.Value(0));
  const [_visibleRest, setVisibleRest] = useState(2);
  const [_centeringOffset, setCenteringOffset] = useState(0);
  const data = useRef<any>({}).current;

  const numColumns = flashListProps.numColumns || 1;
  const containerHeight = '100%'; //(1 + _visibleRest * 2) * itemHeight;
  const paddedOptions = useMemo(() => {
    if (!headerPadding && !footerPadding) return options;

    const array: (any | null)[] = [...options];
    if (numColumns > 1) {
      let i = 0;
      while (array.length % numColumns) {
          array.push({ _id: `filler:${i}`, _type: 'filler', _index: i });
          i++;
      }
    }
    for (let i = 0; i < _visibleRest * numColumns; i++) {
      //array.unshift(null);
      //array.push(null);
      const row = Math.floor(i / numColumns);
      const column = i % numColumns;
      if (headerPadding) array.unshift( { _id: `header:${row}:${column}`, _type: 'header', _row: row, _column: column } );
      if (footerPadding) array.push( { _id: `footer:${row}:${column}`, _type: 'footer', _row: row, _column: column } );
    }
    return array;
  }, [options, headerPadding, footerPadding, _visibleRest, numColumns]);

  /*const offsets = useMemo(
    () => [...Array(paddedOptions.length)].map((x, i) => i * itemHeight),
    [paddedOptions, itemHeight],
  );*/

  const onLayout = (event: any) => {
    const {height} = event.nativeEvent.layout;
    if (height) {
      const vr = Math.floor((height - itemHeight) / 2 / (itemHeight || 40));
      setVisibleRest(Math.max(vr, 1));

      const center = height / 2 - itemHeight / 2;
      const off = center % itemHeight;
      //if (off > itemHeight / 2) off = itemHeight - off;

      setCenteringOffset(off);
    }
    if (flashListProps.onLayout) flashListProps.onLayout(event);
  };

  const currentScrollIndex = useMemo(
    () => Animated.add(Animated.divide(scrollY, itemHeight), _visibleRest),
    [_visibleRest, scrollY, itemHeight],
  );

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const midHeight = event.nativeEvent.layoutMeasurement.height / 2 - itemHeight / 2;
    const index = Math.floor((offsetY + midHeight) / itemHeight);
    if (onChange) onChange(index, index === selectedIndex);
  };

  const setSelectedIndex = useCallback((index: number, animated: boolean) => {
    const actualIndex = Math.floor(index / numColumns) - _visibleRest;
    if (actualIndex < 0 || actualIndex >= Math.floor(options?.length / numColumns)) return false;

    flashListRef.current?.scrollToIndex({
      index: actualIndex,
      animated,
    });

    return true;
  }, [numColumns, options?.length, _visibleRest])

  /**
   * If selectedIndex is changed from outside (not via onChange) we need to scroll to the specified index.
   * This ensures that what the user sees as selected in the picker always corresponds to the value state.
   */
  useEffect(() => {
    if (selectedIndex !== undefined) setSelectedIndex(selectedIndex, false);
  }, [selectedIndex, setSelectedIndex]);

  useEffect(() => {
    if (onMounted) onMounted();
  }, []);

  useImperativeHandle(ref, () => ({
    currentScrollIndex,
    setSelectedIndex,
    current: flashListRef.current
  }));

  const PAD = 2;

  const renderCell = useCallback(({ index, style, children, ...props }) => {
    const relativeScrollIndex = Animated.subtract(index, currentScrollIndex);

    const zIndex = relativeScrollIndex.interpolate({
      inputRange: (() => {
        const range = [0];
        for (let i = 1; i <= _visibleRest + 1 + PAD; i++) {
          range.unshift(-i);
          range.push(i);
        }
        return range;
      })(),
      outputRange: (() => {
        const range = [0];
        for (let z = 1; z <= _visibleRest + 1 + PAD; z++) {
          range.unshift(-z);
          range.push(-z);
        }
        return range;
      })(),
    });
    
    return (
      <AnimatedCellContainer 
        index={index} 
        style={[style, {zIndex, transform: [{translateY: _centeringOffset}]}]}
        pointerEvents="box-none"
        {...props}
      >
        {children}
      </AnimatedCellContainer>
    );
  }, [_visibleRest, _centeringOffset, numColumns]);

  const _renderItem = ({ item: option, index }) => {
    if (!option) return null;
    return (
      <WheelPickerItemFlashList
        index={index}
        column={numColumns ? (index % numColumns) : 0}
        numColumns={numColumns}
        option={option}
        style={itemStyle}
        textStyle={itemTextStyle}
        height={itemHeight}
        currentScrollIndex={currentScrollIndex}
        animationManager={animationManager}
        visibleRest={_visibleRest}
        debug={debug}
      >
        {renderItem && renderItem({option, index})}
      </WheelPickerItemFlashList>
    )
  };

  const _onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: true,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent> | any) => {
        const offsetY = Math.min(itemHeight * (options.length / numColumns - 1), Math.max(event.nativeEvent.contentOffset.y, 0));
        data.currentIndex = Math.round(offsetY / itemHeight);

        if (onScroll) {
          event.numItems = options.length;
          event.itemHeight = itemHeight;
          event.numColumns = numColumns;
          event.visibleRest = _visibleRest;
          onScroll(event);
        }
      }
    },
);

  const animationManager = useRef(new AnimationManager(
    translateFunction,
    rotationFunction,
    opacityFunction,
    scaleFunction
  )).current;

  useEffect(() => {
    animationManager.clear();
  }, [_visibleRest, itemHeight]);

  return (
    <View
      style={[styles.container, { height: containerHeight }, containerStyle]}
      {...containerProps}
    >
      <View
        style={[
          styles.selectedIndicator,
          selectedIndicatorStyle,
          {
            transform: [{ translateY: -itemHeight / 2 }],
            height: itemHeight,
          },
        ]}
      />
      <AnimatedFlashList
        {...flashListProps}
        key={_visibleRest}
        ref={flashListRef}
        onLayout={onLayout}  
        //contentContainerStyle={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={_onScroll}
        CellRendererComponent={renderCell}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        snapToInterval={itemHeight}
        //snapToOffsets={offsets}
        decelerationRate={decelerationRate}
        initialScrollIndex={(options?.length > 0 && selectedIndex >= 0 && selectedIndex <= (options.length - 1)) ? selectedIndex : null}
        estimatedItemSize={itemHeight}
        data={paddedOptions}
        keyExtractor={keyExtractor}
        renderItem={_renderItem}
      />
    </View>
  );
});

export default React.memo(WheelPicker, (prevProps: any, nextProps: any) =>
  _.isEqual(prevProps, nextProps)
);
//export default WheelPicker;
