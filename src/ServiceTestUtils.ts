import { VueWrapper } from "@vue/test-utils";
import { defineComponent, isRef, nextTick } from "vue";
import { default as VIH } from "vue-injection-helper";
const set = VIH.set;

// service function
export type ServiceFunc<T> = (...args: any[]) => T;

/**
 * set up a test unit
 *
 * @export
 * @class TestUnit
 * @template T
 */
export class TestUnit<T> {
  service: ServiceFunc<T>;
  props: any[] = [];
  eventPropsList: any = {};
  constructor(service: ServiceFunc<T>) {
    this.service = service;
  }
}

/**
 * check the ref value
 *
 * @export
 * @param {VueWrapper<any>} wrapper
 * @param {(string | number)} key
 * @param {boolean} [isObj]
 * @returns
 */
export function checkValue(
  wrapper: VueWrapper<any>,
  key: string | number,
  isObj?: boolean
) {
  return wrapper.get("#" + key + (isObj ? "-obj" : "")).text();
}

/**
 * trigger domain event on component
 *
 * @export
 * @param {VueWrapper<any>} wrapper
 * @param {(string | number)} key
 */
export async function triggerEvent(
  wrapper: VueWrapper<any>,
  key: string | number
) {
  try {
    await wrapper.get("#" + key).trigger("click");
    await nextTick();
  } catch (err) {
    console.error("cannot trigger event of key:" + key);
  }
}

/**
 * get component of certain test unit
 *
 * @export
 * @template T
 * @param {TestUnit<T>} testUnit
 * @param {number} [layer=0]
 * @param {number} [index=0]
 * @returns
 */
export function getCompo<T>(
  testUnit: TestUnit<T>,
  layer: number = 0,
  index: number = 0
) {
  return defineComponent({
    setup() {
      const result = testUnit.service(...testUnit.props);
      const strObj____ = (val: any) => JSON.stringify(val);
      const setServiceValue = (props: { keyPath: string[]; value: any }) => {
        set(result as any, props.keyPath, props.value);
      };
      const values: any[] = [];
      const events: any[] = [];
      for (let key of Object.keys(result)) {
        if (isRef((result as any)[key])) {
          values.push([key, (result as any)[key]]);
        } else {
          events.push([key, (result as any)[key]]);
        }
      }
      return {
        layer,
        index,
        values,
        events,
        eventProps: testUnit.eventPropsList,
        setServiceValue,
        strObj____,
      };
    },
    template: `
    <div>
      <span v-for="item in values" :key="item[0]" :id="item[0]+(layer?'-'+layer:'')+(index?'-'+index:'')">{{item[1]?.value}}</span>
      <span v-for="item in values" :key="item[0]" :id="item[0]+'-obj'+(layer?'-'+layer:'')+(index?'-'+index:'')">{{strObj____(item[1]?.value)}}</span>
      <span v-for="item in events" :id="item[0]+(layer?'-'+layer:'')+(index?'-'+index:'')" @click="item[1](eventProps[item[0]])"></span>
      <span :id="'setValue'+(layer?'-'+layer:'')+(index?'-'+index:'')" @click="setServiceValue(eventProps['setValue'])"></span>
      <slot></slot>
    </div>
    `,
  });
}

/**
 * get component of nested units
 *
 * @export
 * @param {...TestUnit<any>[]} testUnits
 * @returns
 */
export function getCompoNested(...testUnits: TestUnit<any>[]) {
  return defineComponent({
    name: "mapping-compo",
    props: ["index"],
    template: `
      <component v-if="compo" :is="compo">
             <mapping-compo  :index="index?(index+1):1"></mapping-compo>
      </component>
    `,
    computed: {
      compo() {
        const unit = testUnits[(this as any).index];
        return unit
          ? getCompo(unit, (this as any).index)
          : (this as any).index
          ? null
          : getCompo(testUnits[0]);
      },
    },
  });
}

/**
 * mapping of test units
 *
 * @export
 * @interface UnitMapping
 */
export interface UnitMapping {
  unit: TestUnit<any>;
  children?: UnitMapping[];
}

/**
 * get test units mapping component
 *
 * @export
 * @param {UnitMapping} testUnits
 * @returns
 */
export function getCompoMapping(testUnits: UnitMapping) {
  return defineComponent({
    name: "mapping-compo",
    props: ["units", "layer", "idx"],
    template: `
      <component :is="compo">
             <mapping-compo 
             v-for="item,index in children" 
             :units = "item"
             :layer="layer?(layer+1):1"
             :idx="index"
             ></mapping-compo>
      </component>
    `,
    computed: {
      compo() {
        const self: any = this;
        const unit = self.units ? self.units.unit : testUnits.unit;
        return getCompo(
          unit,
          self.layer ? self.layer : 0,
          self.idx ? self.idx : 0
        );
      },
      children() {
        const self: any = this;
        if (self.units) {
          if (self.units.children) {
            return self.units.children;
          }
          return [];
        }
        return testUnits.children;
      },
    },
  });
}

/**
 * wait for mini seconds
 *
 * @export
 * @param {number} n
 * @returns
 */
export function wait(n: number) {
  return new Promise((res) => {
    setTimeout(res, n);
  });
}
