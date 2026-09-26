export const bucket = new sst.aws.Bucket("MyBucket");

export const database = new sst.aws.Dynamo("Database", {
  fields: {
    pk: "string",
    sk: "string",
  },
  primaryIndex: {
    hashKey: "pk",
    rangeKey: "sk",
  },
});
