import React from 'react';
import { Grommet, Box, Table, TableHeader, TableRow, TableCell, TableBody, Button } from 'grommet';
import * as tf from '@tensorflow/tfjs';
import * as hpjs from 'hyperparameters';
import iris from '../data/iris-training';
import irisTesting from '../data/iris-testing';

let predictions;
class Index extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      formattedPredictions: [],
    };
  }

  arrayto2dArray = (array, size) => {
    const newArray = [];
    for (let i = 0; i < array.length; i += size) {
      newArray.push(array.slice(i, i + size));
    }
    this.setState({
      predictions: newArray, // eslint-disable-line react/no-unused-state
    });
  };


  optFunction = async ({ numLayers }, { trainingData, outputData }) => {
    const model = tf.sequential();

    console.log(numLayers);
    for (let i = 0; i < numLayers; i += 1) {
      model.add(tf.layers.dense({
        inputShape: i === 0 ? [4] : [5], // if first layer
        activation: 'sigmoid',
        units: i === numLayers - 1 ? 3 : 5,
      }));
    }

    model.compile({
      loss: 'meanSquaredError',
      optimizer: tf.train.adam(0.06),
    });

    const h = await model.fit(trainingData, outputData, { epochs: 100 });

    // return the model, loss, and status
    return {
      model,
      loss: h.history.loss[h.history.loss.length - 1],
      status: hpjs.STATUS_OK,
    };
  };


  trainAndPredict = async () => {
    const space = {
      numLayers: hpjs.quniform(1, 5, 1),
    };


    const trainingData = tf.tensor2d(iris.map(item => [
      item.sepal_length, item.sepal_width, item.petal_length, item.petal_width,
    ]));

    const outputData = tf.tensor2d(iris.map(item => [
      item.species === 'setosa' ? 1 : 0,
      item.species === 'virginica' ? 1 : 0,
      item.species === 'versicolor' ? 1 : 0,
    ]));

    const testingData = tf.tensor2d(irisTesting.map(item => [
      item.sepal_length, item.sepal_width, item.petal_length, item.petal_width,
    ]));

    const testingOutput = irisTesting.map(item => [
      item.species,
    ]);

    const trials = await hpjs.fmin(
      this.optFunction, space, hpjs.search.randomSearch, 3,
      { rng: new hpjs.RandomState(64321), trainingData, outputData }
    );

    const opt = trials.argmin;

    console.log(opt);

    const { model } = await this.optFunction(opt, { trainingData, outputData });

    predictions = model.predict(testingData).dataSync();

    const formattedArray = [];
    for (let i = 0; i < predictions.length; i += 3) {
      let row = predictions.slice(i, i + 3); // adding testing predictions to array
      row = Array.prototype.slice.call(row);
      row[3] = testingOutput[i / 3]; // adding testing answers to array
      formattedArray.push(row);
    }

    this.setState({
      formattedPredictions: formattedArray, // eslint-disable-line react/no-unused-state
    });
    
    console.log(formattedArray);
  }

  render() {
    const { formattedPredictions } = this.state;
    return (
      <Grommet>
        <Box direction='column' align='center' gap='medium'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell size='xsmall' scope='col' border='bottom'><b>Setosa</b></TableCell>
                <TableCell size='xsmall' scope='col' border='bottom'><b>Virginica</b></TableCell>
                <TableCell size='xsmall' scope='col' border='bottom'><b>Versicolor</b></TableCell>
                <TableCell size='xsmall' scope='col' border='bottom'><b>Actual</b></TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formattedPredictions.map((e, index) => (
                <TableRow key={`predictions_${index}`}>
                  <TableCell size='xxsmall' scope='row'>{e[0]}</TableCell>
                  <TableCell size='xxsmall' scope='row'>{e[1]}</TableCell>
                  <TableCell size='xxsmall' scope='row'>{e[2]}</TableCell>
                  <TableCell size='xxsmall' scope='row'>{e[3]}</TableCell>
                </TableRow>
                ))}
            </TableBody>
          </Table>
          <Button
            label='Start Training'
            onClick={this.trainAndPredict}
          />
        </Box>
      </Grommet>
    );
  }
}

export default Index;
