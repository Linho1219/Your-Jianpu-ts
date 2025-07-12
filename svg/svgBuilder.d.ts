declare module 'svg-builder' {
  interface SvgAttributes {
    [key: string]: string | number;
  }

  interface SvgBuilder {
    width(value: number): this;
    height(value: number): this;
    viewBox(value: string): this;
    render(): string;
    buffer(): Buffer;
    reset(): this;
    newInstance(): SvgBuilder;

    a(attrs: SvgAttributes, content?: string): this;
    g(attrs: SvgAttributes, content?: string): this;
    circle(attrs: SvgAttributes, content?: string): this;
    foreignObject(attrs: SvgAttributes, content?: string): this;
    line(attrs: SvgAttributes, content?: string): this;
    path(attrs: SvgAttributes, content?: string): this;
    rect(attrs: SvgAttributes, content?: string): this;
    style(attrs: SvgAttributes, content?: string): this;
    text(attrs: SvgAttributes, content?: string): this;
    image(attrs: SvgAttributes, content?: string): this;
  }

  const builder: SvgBuilder;
  export = builder;
}
