import React, { useState, useEffect } from 'react';
import { Animated, StyleSheet, View, LayoutChangeEvent, Text, TextInput, I18nManager } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

const SMALL_SIZE = 24;
const MEDIUM_SIZE = 34;
const LARGE_SIZE = 44;

const osRtl = I18nManager.isRTL;

interface SliderProps {
    min: number,
    max: number,
    fromValueOnChange: (value: number) => void,
    toValueOnChange: (value: number) => void,
    step?: number,
    styleSize?: 'small' | 'medium' | 'large' | number,
    fromKnobColor?: string,
    toKnobColor?: string,
    inRangeBarColor?: string,
    outOfRangeBarColor?: string,
    valueLabelsTextColor?: string,
    valueLabelsBackgroundColor?: string,
    rangeLabelsTextColor?: string,
    showRangeLabels?: boolean,
    showValueLabels?: boolean,
    initialFromValue?: number,
    initialToValue?: number,
    formatValue?: (value:number) => string
}

export default ({
    min, max, fromValueOnChange, toValueOnChange,
    step = 1,
    styleSize = 'medium',
    fromKnobColor = '#00a2ff',
    toKnobColor = '#00a2ff',
    inRangeBarColor = 'rgb(100,100,100)',
    outOfRangeBarColor = 'rgb(200,200,200)',
    valueLabelsTextColor = 'white',
    valueLabelsBackgroundColor = '#3a4766',
    rangeLabelsTextColor = 'rgb(60,60,60)',
    showRangeLabels = true,
    showValueLabels = true,
    initialFromValue,
    initialToValue,
    formatValue = (value:number) => value.toString()
}: SliderProps) => {

    // settings
    const [wasInitialized, setWasInitialized] = useState(false);
    const [knobSize, setknobSize] = useState(0);
    const [fontSize, setFontSize] = useState(15);
    const [stepInPixels, setStepInPixels] = useState(0);

    // rtl settings
    const [flexDirection, setFlexDirection] = useState<"row" | "row-reverse" | "column" | "column-reverse" | undefined>('row');
    const [svgOffset, setSvgOffset] = useState<object>({ left: (knobSize - 40) / 2 });

    const [fromValueOffset, setFromValueOffset] = useState(0);
    const [toValueOffset, setToValueOffset] = useState(0);
    const [sliderWidth, setSliderWidth] = useState(0);
    const [fromElevation, setFromElevation] = useState(3);
    const [toElevation, setToElevation] = useState(3);

    // animation values
    const [translateXfromValue] = useState(new Animated.Value(0));
    const [translateXtoValue] = useState(new Animated.Value(0));
    const [fromValueScale] = useState(new Animated.Value(0.01));
    const [toValueScale] = useState(new Animated.Value(0.01));
    const [rightBarScaleX] = useState(new Animated.Value(0.01));
    const [leftBarScaleX] = useState(new Animated.Value(0.01));

    // refs
    const toValueTextRef = React.createRef<TextInput>();
    const fromValueTextRef = React.createRef<TextInput>();
    const opacity = React.useRef<Animated.Value>(new Animated.Value(0)).current;

    // initalizing settings
    useEffect(() => {
        setFlexDirection(osRtl ? 'row-reverse' : 'row');
        setSvgOffset(osRtl ? { right: (knobSize - 40) / 2 } : { left: (knobSize - 40) / 2 });
    }, [knobSize]);
    useEffect(() => {
        if (wasInitialized) {
            const stepSize = setStepSize(max, min, step);
            fromValueTextRef.current?.setNativeProps({ text: formatValue(min) });
            toValueTextRef.current?.setNativeProps({ text: formatValue(max) });
            if (typeof initialFromValue === 'number' && initialFromValue >= min && initialFromValue <= max) {
                const offset = ((initialFromValue - min) / step) * stepSize - (knobSize / 2);
                setFromValueStatic(offset, knobSize, stepSize);
                setValueText(offset + knobSize, true);
            }
            if (typeof initialToValue === 'number' && initialToValue >= min && initialToValue <= max && typeof initialFromValue === 'number' && initialToValue > initialFromValue) {
                const offset = ((initialToValue - min) / step) * stepSize - (knobSize / 2);
                setToValueStatic(offset, knobSize, stepSize);
                setValueText(offset, false);
            }
            Animated.timing(opacity, {
                toValue: 1,
                duration: 64,
                useNativeDriver: true
            }).start();
        }
    }, [min, max, step, initialFromValue, initialToValue, wasInitialized]);
    useEffect(() => {
        const size = typeof styleSize === 'number' ? styleSize : styleSize === 'small' ? SMALL_SIZE : styleSize === 'medium' ? MEDIUM_SIZE : LARGE_SIZE;
        setknobSize(size);
        translateXfromValue.setValue(-size / 4);
    }, [styleSize]);

    // initalizing settings helpers
    const setFromValueStatic = (newOffset: number, knobSize: number, stepInPixels: number) => {
        newOffset = Math.floor((newOffset + (knobSize / 2)) / stepInPixels) * stepInPixels - (knobSize / 2);
        setFromValue(newOffset);
        setFromValueOffset(newOffset);
        fromValueOnChange(Math.floor(((newOffset + (knobSize / 2)) * (max - min) / sliderWidth) / step) * step + min);
    }
    const setFromValue = (newOffset: number) => {
        translateXfromValue.setValue(newOffset);
        leftBarScaleX.setValue((newOffset + (knobSize / 2)) / sliderWidth + 0.01);
    }
    const setToValueStatic = (newOffset: number, knobSize: number, stepInPixels: number) => {
        newOffset = Math.ceil((newOffset + (knobSize / 2)) / stepInPixels) * stepInPixels - (knobSize / 2);
        setToValue(newOffset);
        setToValueOffset(newOffset);
        toValueOnChange(Math.ceil(((newOffset + (knobSize / 2)) * (max - min) / sliderWidth) / step) * step + min);
    }
    const setToValue = (newOffset: number) => {
        translateXtoValue.setValue(newOffset);
        rightBarScaleX.setValue(1.01 - ((newOffset + (knobSize / 2)) / sliderWidth));
    }
    const setStepSize = (max: number, min: number, step: number) => {
        const numberOfSteps = ((max - min) / step);
        const stepSize = sliderWidth / numberOfSteps;
        setStepInPixels(stepSize);
        return stepSize;
    }
    const setValueText = (totalOffset: number, from = true) => {
        if (from && fromValueTextRef != null) {
            const numericValue: number = Math.floor(((totalOffset + (knobSize / 2)) * (max - min) / sliderWidth) / step) * step + min;
            fromValueTextRef.current?.setNativeProps({ text: formatValue(numericValue) });
        }
        else if (from === false && toValueTextRef != null) {
            const numericValue: number = Math.ceil(((totalOffset + (knobSize / 2)) * (max - min) / sliderWidth) / step) * step + min;
            toValueTextRef.current?.setNativeProps({ text: formatValue(numericValue) });
        }
    }


    // from value gesture events ------------------------------------------------------------------------
    const onGestureEventFromValue = (event: PanGestureHandlerGestureEvent) => {
        let totalOffset = event.nativeEvent.translationX + fromValueOffset;
        if (totalOffset >= -knobSize / 2 && totalOffset < toValueOffset) {
            translateXfromValue.setValue(totalOffset);
            setValueText(totalOffset, true);
            leftBarScaleX.setValue((totalOffset + (knobSize / 2)) / sliderWidth + 0.01);
        }
    }
    const onHandlerStateChangeFromValue = (event: PanGestureHandlerGestureEvent) => {
        if (event.nativeEvent.state === State.BEGAN) {
            scaleTo(fromValueScale, 1);
            setElevations(6, 5);
        }
        if (event.nativeEvent.state === State.END) {
            let newOffset = event.nativeEvent.translationX + fromValueOffset;
            newOffset = Math.floor((newOffset + (knobSize / 2)) / stepInPixels) * stepInPixels - (knobSize / 2);
            if (newOffset < -knobSize / 2) {
                newOffset = -knobSize / 2;
            } else if (newOffset >= toValueOffset) {
                newOffset = toValueOffset - stepInPixels;
            }
            setFromValueStatic(newOffset, knobSize, stepInPixels)
            scaleTo(fromValueScale, 0.01);
        }
    }
    // ------------------------------------------------------------------------------------------------

    // to value gesture events ------------------------------------------------------------------------
    const onGestureEventToValue = (event: PanGestureHandlerGestureEvent) => {
        const totalOffset = event.nativeEvent.translationX + toValueOffset;
        if (totalOffset <= sliderWidth - knobSize / 2 && totalOffset > fromValueOffset) {
            translateXtoValue.setValue(totalOffset);
            setValueText(totalOffset, false);
            rightBarScaleX.setValue(1.01 - ((totalOffset + (knobSize / 2)) / sliderWidth));
        }
    }
    const onHandlerStateChangeToValue = (event: PanGestureHandlerGestureEvent) => {
        if (event.nativeEvent.state === State.BEGAN) {
            scaleTo(toValueScale, 1);
            setElevations(5, 6);
        }
        if (event.nativeEvent.state === State.END) {
            let newOffset = event.nativeEvent.translationX + toValueOffset;
            newOffset = Math.ceil((newOffset + (knobSize / 2)) / stepInPixels) * stepInPixels - (knobSize / 2);
            if (newOffset > sliderWidth - knobSize / 2) {
                newOffset = sliderWidth - knobSize / 2;
            } else if (newOffset <= fromValueOffset) {
                newOffset = fromValueOffset + stepInPixels;
            }
            setToValueOffset(newOffset);
            translateXtoValue.setValue(newOffset);
            rightBarScaleX.setValue(1.01 - ((newOffset + (knobSize / 2)) / sliderWidth));
            scaleTo(toValueScale, 0.01);
            toValueOnChange(Math.ceil(((newOffset + (knobSize / 2)) * (max - min) / sliderWidth) / step) * step + min);
        }
    }
    // ------------------------------------------------------------------------------------------------

    // gesture events help functions ------------------------------------------------------------------
    const scaleTo = (param: Animated.Value, toValue: number) => Animated.timing(param,
        {
            toValue,
            duration: 150,
            useNativeDriver: true
        }
    ).start();

    const setElevations = (fromValue: number, toValue: number) => {
        setFromElevation(fromValue);
        setToElevation(toValue)
    }
    // ------------------------------------------------------------------------------------------------

    // setting bar width ------------------------------------------------------------------------------
    const onLayout = (event: LayoutChangeEvent) => {
        if (wasInitialized === false) {
            const { width } = event.nativeEvent.layout;
            setSliderWidth(width);
            translateXtoValue.setValue(width - knobSize / 2);
            setToValueOffset(width - knobSize / 2);
            setWasInitialized(true);
        }
    }
    // ------------------------------------------------------------------------------------------------

    return (
        <Animated.View style={[styles.container, { opacity, padding: styleSize === 'large' ? 7 : styleSize === 'medium' ? 14 : 21 }]}>
            {
                showValueLabels &&
                <View style={{ width: '100%',height: 1, flexDirection }}>
                    <Animated.View
                        style={{ position: 'absolute', bottom: 0, left: 0, transform: [{ translateX: translateXfromValue }, { scale: fromValueScale }] }}
                    >

                        <Svg width={40} height={56} style={[svgOffset, { justifyContent: 'center', alignItems: 'center' }]} >
                            <Path
                                d="M20.368027196163986,55.24077513402203 C20.368027196163986,55.00364778429386 37.12897994729114,42.11537830086061 39.19501224411266,22.754628132990383 C41.26104454093417,3.393877965120147 24.647119286738516,0.571820003300814 20.368027196163986,0.7019902620266703 C16.088935105589453,0.8321519518460209 -0.40167016290734386,3.5393865664909434 0.7742997013327574,21.806127302984205 C1.950269565572857,40.07286803947746 20.368027196163986,55.4779024837502 20.368027196163986,55.24077513402203 z"
                                strokeWidth={1}
                                fill={valueLabelsBackgroundColor}
                                stroke={valueLabelsBackgroundColor}
                            />
                        </Svg>
                        <TextInput editable={false} style={{ position: 'absolute', width: 40, textAlign: 'center', ...svgOffset, color: valueLabelsTextColor, bottom: 25, fontWeight: 'bold' }} ref={fromValueTextRef} />
                    </Animated.View>
                    <Animated.View
                        style={{ position: 'absolute', bottom: 0, left: 0, alignItems: 'center', transform: [{ translateX: translateXtoValue }, { scale: toValueScale }] }}
                    >
                        <Svg width={40} height={56} style={[svgOffset, { justifyContent: 'center', alignItems: 'center' }]} >
                            <Path
                                d="M20.368027196163986,55.24077513402203 C20.368027196163986,55.00364778429386 37.12897994729114,42.11537830086061 39.19501224411266,22.754628132990383 C41.26104454093417,3.393877965120147 24.647119286738516,0.571820003300814 20.368027196163986,0.7019902620266703 C16.088935105589453,0.8321519518460209 -0.40167016290734386,3.5393865664909434 0.7742997013327574,21.806127302984205 C1.950269565572857,40.07286803947746 20.368027196163986,55.4779024837502 20.368027196163986,55.24077513402203 z"
                                strokeWidth={1}
                                fill={valueLabelsBackgroundColor}
                                stroke={valueLabelsBackgroundColor}
                            />
                        </Svg>
                        <TextInput editable={false} style={{ position: 'absolute', width: 40, textAlign: 'center', ...svgOffset, color: valueLabelsTextColor, bottom: 25, fontWeight: 'bold' }} ref={toValueTextRef} />
                    </Animated.View>
                </View>
            }
            <View style={{ width: '100%', height: knobSize, marginVertical: 4, position: 'relative', flexDirection, alignItems: 'center' }}>
                <View style={{ position: 'absolute', backgroundColor: inRangeBarColor, left: knobSize / 4, marginLeft: -knobSize / 4, right: knobSize / 4, height: knobSize / 3 }} onLayout={onLayout} />
                <Animated.View style={{ position: 'absolute', left: knobSize / 4, marginLeft: -knobSize / 4, right: knobSize / 4, height: knobSize / 3, backgroundColor: outOfRangeBarColor, transform: [{ translateX: sliderWidth / 2 }, { scaleX: rightBarScaleX }, { translateX: -sliderWidth / 2 }] }} />
                <Animated.View style={{ position: 'absolute', left: -knobSize / 4, width: knobSize / 2, height: knobSize / 3, borderRadius: knobSize / 3, backgroundColor: outOfRangeBarColor }} />
                <Animated.View style={{ width: sliderWidth, height: knobSize / 3, backgroundColor: outOfRangeBarColor, transform: [{ translateX: -sliderWidth / 2 }, { scaleX: leftBarScaleX }, { translateX: sliderWidth / 2 }] }} />
                <Animated.View style={{ position: 'absolute', left: sliderWidth - knobSize / 4, width: knobSize / 2, height: knobSize / 3, borderRadius: knobSize / 3, backgroundColor: outOfRangeBarColor }} />
                <PanGestureHandler onGestureEvent={onGestureEventFromValue} onHandlerStateChange={onHandlerStateChangeFromValue}>
                    <Animated.View style={[styles.knob, { height: knobSize, width: knobSize, borderRadius: knobSize, backgroundColor: fromKnobColor, elevation: fromElevation, transform: [{ translateX: translateXfromValue }] }]} />
                </PanGestureHandler>
                <PanGestureHandler onGestureEvent={onGestureEventToValue} onHandlerStateChange={onHandlerStateChangeToValue}>
                    <Animated.View style={[styles.knob, { height: knobSize, width: knobSize, borderRadius: knobSize, backgroundColor: toKnobColor, elevation: toElevation, transform: [{ translateX: translateXtoValue }] }]} />
                </PanGestureHandler>
            </View>
            {
                showRangeLabels &&
                <View style={{ width: '100%', flexDirection, justifyContent: 'space-between' }}>
                    <Text style={{ color: rangeLabelsTextColor, fontWeight: "bold", fontSize }}>{formatValue(min)}</Text>
                    <Text style={{ color: rangeLabelsTextColor, fontWeight: "bold", fontSize }}>{formatValue(max)}</Text>
                </View>
            }
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 100,
        width: '100%'
    },
    knob: {
        position: 'absolute',
        elevation: 4
    }
});
