const PAD = 2;

export default class AnimationManager {    
    constructor(
        translateFunction,
        rotationFunction,
        opacityFunction,
        scaleFunction
    ) {
        super.constructor();
        this.translateFunction = translateFunction;
        this.rotationFunction = rotationFunction;
        this.opacityFunction = opacityFunction;
        this.scaleFunction = scaleFunction;
    }

    cache = [];

    clear() {
        this.cache = [];
    }

    get(relativeScrollIndex, info) {
        const {visibleRest, column, height, numColumns} = info;
        const key = column; //`${column}`;

        if (!this.cache[key]) {
            const translateFunction = this.translateFunction;
            const rotationFunction = this.rotationFunction;
            const opacityFunction = this.opacityFunction;
            const scaleFunction = this.scaleFunction;
    
            this.cache[key] = {
                translateX: {
                    inputRange: (() => {
                        const range = [0];
                        for (let i = 1; i <= visibleRest + 1 + PAD; i++) {
                            range.unshift(-i);
                            range.push(i);
                        }
                        return range;
                    })(),
                    outputRange: (() => {
                        const range = [translateFunction(0, info)];
                        for (let i = 1; i <= visibleRest + 1 + PAD; i++) {
                            const y = translateFunction(i, info);
                            range.unshift(y);
                            range.push(y);
                        }
                        return range;
                    })(),        
                },
                translateY: {
                    inputRange: (() => {
                        const range = [0];
                        for (let i = 1; i <= visibleRest + 1 + PAD; i++) {
                            range.unshift(-i);
                            range.push(i);
                        }
                        return range;
                    })(),
                    outputRange: (() => {
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
                    })(),        
                },
                opacity: {
                    inputRange: (() => {
                        const range = [0];
                        for (let i = 1; i <= visibleRest + 1 + PAD; i++) {
                            range.unshift(-i);
                            range.push(i);
                        }
                        return range;
                    })(),
                    outputRange: (() => {
                        const range = [1];
                        for (let x = 1; x <= visibleRest + 1 + PAD; x++) {
                            const y = opacityFunction(x, info);
                            range.unshift(y);
                            range.push(y);
                        }
                        return range;
                    })(),        
                },
                scale: {
                    inputRange: (() => {
                        const range = [0];
                        for (let i = 1; i <= visibleRest + 1 + PAD; i++) {
                            range.unshift(-i);
                            range.push(i);
                        }
                        return range;
                    })(),
                    outputRange: (() => {
                        const range = [1.0];
                        for (let x = 1; x <= visibleRest + 1 + PAD; x++) {
                            const y = scaleFunction(x, info);
                            range.unshift(y);
                            range.push(y);
                        }
                        return range;
                    })(),        
                },
                rotateX: {
                    inputRange: (() => {
                        const range = [0];
                        for (let i = 1; i <= visibleRest + 1 + PAD; i++) {
                            range.unshift(-i);
                            range.push(i);
                        }
                        return range;
                    })(),
                    outputRange: (() => {
                        const range = ['0deg'];
                        for (let x = 1; x <= visibleRest + 1 + PAD; x++) {
                            const y = rotationFunction(x, info);
                            range.unshift(`${y}deg`);
                            range.push(`${y}deg`);
                        }
                        return range;
                    })(),        
                },
            }
        }

        const config = this.cache[key];

        return {
            translateX: relativeScrollIndex.interpolate(config.translateX),
            translateY: relativeScrollIndex.interpolate(config.translateY),
            opacity: relativeScrollIndex.interpolate(config.opacity),
            scale: relativeScrollIndex.interpolate(config.scale),
            rotateX: relativeScrollIndex.interpolate(config.rotateX),
        }
    }
}