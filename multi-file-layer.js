import { CompositeLayer } from "@deck.gl/core";
import { MaskExtension } from "@deck.gl/extensions";
import { ScatterplotLayer } from "@deck.gl/layers";
import { load } from "@loaders.gl/core";
import { CSVLoader } from "@loaders.gl/csv";

// Custom deck.gl layer
// It consumes Masked `dataUrl` for input data and loads conform data from multiple files
// Data format should be point data. Use `getPosition` accessor to transform data rows to
// geospatial coordinates
export class MultiFileLayer extends CompositeLayer {
  // Default props
  static defaultProps = {
    data: [],
    dataUrl: "",
    maskLength: 12,
    getPosition: { type: "accessor", value: (d) => [d.longitude, d.latitude] },
    getRadius: 4,
    getFillColor: [255, 140, 0, 202],
    getLineColor: [140, 140, 0, 255],
    getLineWidth: 10,
    radiusScale: 1,
    maskId: "",
  };

  constructor(props) {
    super(props);
    this.state = {
      // Output data for rendering. Rows from all files will be accumulated here
      subLayerData: [],
      // Remember actual dataUrl to detect when it changes
      currentDataUrl: "",
      // The `subLayerData` array is mutating instead of re-creating to resolve performance issues
      // We will change this numeric variable to cause the layer re-rendering
      loadingFrame: 0,
    };
  }

  updateState({ props }) {
    // Run loading when `dataUrl` has changed
    if (props.dataUrl && props.dataUrl !== this.state.currentDataUrl) {
      this.setState({ subLayerData: [], currentDataUrl: props.dataUrl });
      this.currentDataUrl = props.dataUrl;
      // Async function to run http requests
      async function loadAllFiles() {
        for (let i = 0; i < 100; i++) {
          const index = i.toString().padStart(props.maskLength, "0");
          // Use @loaders.gl API to load and parse csv files
          const result = await load(
            this.state.currentDataUrl.replace("*", index),
            CSVLoader
          );

          // Add new rows to the array
          const newSublayerData = this.state.subLayerData ?? [];
          for (const row of result.data) {
            newSublayerData.push(row);
          }
          this.setState({
            subLayerData: newSublayerData,
            loadingFrame: this.state.loadingFrame++,
          });
        }
      }
      // Call the function with preserved context
      loadAllFiles.call(this);
    }
  }

  // Render function. deck.gl Layer has conform logic with React components
  renderLayers() {
    return [
      new ScatterplotLayer({
        id: `${this.props.id}-POIs`,
        data: this.state.subLayerData,

        stroked: true,
        getPosition: (d) => [d.longitude, d.latitude],
        getRadius: this.props.getRadius,
        getFillColor: this.props.getFillColor,
        getLineColor: this.props.getLineColor,
        getLineWidth: this.props.getLineWidth,
        radiusScale: this.props.radiusScale,

        extensions: [new MaskExtension()],
        updateTriggers: {
          // Update the layer when loading frame has changed
          // We need it because `subLayerData` is mutating
          getPosition: [this.state.loadingFrame],
        },
        maskId: this.props.maskId,
      }),
    ];
  }
}
MultiFileLayer.layerName = "MultiFileLayer";
