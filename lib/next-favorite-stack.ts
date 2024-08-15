import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { helloWorldConstruct } from "./constructs/hello-world";
import { postConfirmationConstruct } from "./constructs/auth/post-confirmation";
import { userPoolConstruct } from "./constructs/auth/user-pool";
import { dynamoTableConstruct } from "./constructs/dynamo-table";
import { oauthTokenConstruct } from "./constructs/auth/oauth-token";
import { apiGatewayConstruct } from "./constructs/api-gateway";
import { secretsManagerConstruct } from "./constructs/secrets-manager";
import { loginConstruct } from "./constructs/auth/login";
import { signupConstruct } from "./constructs/auth/signup";
import { userConfirmationConstruct } from "./constructs/auth/user-confirmation";
import { iamConstruct } from "./constructs/auth/iam";
import { createRecommendSourceConstruct } from "./constructs/recomment-source/create";
import { checkAdminGroupConstruct } from "./constructs/auth/check-admin-group";
import { traktSearchMovieConstruct } from "./constructs/trakt/search-movie";
import { createFavoriteItemConstruct } from "./constructs/favorite/create";
import { deleteFavoriteItemConstruct } from "./constructs/favorite/delete";
import { createIgnoreItemConstruct } from "./constructs/ignore/create";
import { deleteIgnoreItemConstruct } from "./constructs/ignore/delete";
import { traktGetTrendMovieConstruct } from "./constructs/trakt/get-trend-movie";
import { traktRecommendMovieConstruct } from "./constructs/trakt/recommend-movie";
import { readFavoriteItemConstruct } from "./constructs/favorite/read";
import { readIgnoreItemConstruct } from "./constructs/ignore/read";
import { traktSearchShowConstruct } from "./constructs/trakt/search-show";
import { traktGetTrendShowConstruct } from "./constructs/trakt/get-trend-show";
import { traktRecommendShowConstruct } from "./constructs/trakt/recommend-show";
import { jikanSearchAnimeConstruct } from "./constructs/jikan/search-anime";
import { jikanRecommendAnimeConstruct } from "./constructs/jikan/recommend-anime";
import { jikanGetTrendAnimeConstruct } from "./constructs/jikan/get-trend-anime";
import { traktGetDetailMovieConstruct } from "./constructs/trakt/get-detail-movie";
import { traktGetDetailShowConstruct } from "./constructs/trakt/get-detail-show";
import { jikanGetDetailAnimeConstruct } from "./constructs/jikan/get-detail-anime";
import { getUserConstruct } from "./constructs/auth/get-user";
import { getAllRecommendSourcesConstruct } from "./constructs/recomment-source/read";

interface NextFavoriteProps extends cdk.StackProps {}

export class NextFavoriteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NextFavoriteProps) {
    super(scope, id, props);
    const env = scope.node.tryGetContext("env");
    const removalPolicy =
      env === "dev" ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;

    // Hello World construct
    helloWorldConstruct({ scope: this, env });

    // DynamoDB Table construct
    const { userTable, recommendSourceTable, favoriteTable, ignoreTable } =
      dynamoTableConstruct({
        scope: this,
        env,
        removalPolicy,
      });

    // Post Confirmation construct
    const postConfirmationFunction = postConfirmationConstruct({
      scope: this,
      env,
      tableName: userTable.tableName,
    });
    userTable.grantWriteData(postConfirmationFunction);

    // User Pool construct
    const { appClient, userPool, cognitoAuthorizer } = userPoolConstruct({
      scope: this,
      env,
      postConfirmationFunction,
      removalPolicy,
      // userRole,
      // adminRole,
    });

    // IAM construct
    const { checkAdminGroupRole } = iamConstruct({
      scope: this,
      env,
      userPoolId: userPool.userPoolId,
    });

    // Secrets Manager construct
    const { cognitoAppClientSecret } = secretsManagerConstruct({
      scope: this,
      env,
      appClientSecret: appClient.userPoolClientSecret,
    });

    // OAuth Token construct
    const { oauthTokenFunction } = oauthTokenConstruct({
      scope: this,
      env,
      clientId: appClient.userPoolClientId,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(oauthTokenFunction);

    // Login construct
    const { loginFunction } = loginConstruct({
      scope: this,
      env,
      clientId: appClient.userPoolClientId,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(loginFunction);

    // Signup construct
    const { signupFunction } = signupConstruct({
      scope: this,
      env,
      clientId: appClient.userPoolClientId,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(signupFunction);

    // User Confirmation construct
    const { userConfirmationFunction } = userConfirmationConstruct({
      scope: this,
      env,
      clientId: appClient.userPoolClientId,
      secretName: cognitoAppClientSecret.secretName,
    });
    cognitoAppClientSecret.grantRead(userConfirmationFunction);

    // Get User construct
    const { getUserFunction } = getUserConstruct({
      scope: this,
      env,
    });

    // Create Recommend Source construct
    const { createRecommendSourceFunction } = createRecommendSourceConstruct({
      scope: this,
      env,
      tableName: recommendSourceTable.tableName,
    });
    recommendSourceTable.grantWriteData(createRecommendSourceFunction);

    // Get All Recommend Sources construct
    const { getAllRecommendSourcesFunction } = getAllRecommendSourcesConstruct({
      scope: this,
      env,
      tableName: recommendSourceTable.tableName,
    });
    recommendSourceTable.grantReadData(getAllRecommendSourcesFunction);

    // Check Admin Group construct
    const { checkAdminGroupFunction } = checkAdminGroupConstruct({
      scope: this,
      env,
      userPoolId: userPool.userPoolId,
      role: checkAdminGroupRole,
    });

    // Trakt Search Movie construct
    const { traktSearchMovieFunction } = traktSearchMovieConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(traktSearchMovieFunction);
    ignoreTable.grantReadData(traktSearchMovieFunction);

    // Assign read permission from trakt api secret to trakt search movie function
    const traktApiSecretId = `NF-TraktApiKeySecret-${env}`;
    const traktApiKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      traktApiSecretId,
      traktApiSecretId
    );
    traktApiKeySecret.grantRead(traktSearchMovieFunction);

    // Assign read permission from tmdb api secret to trakt search movie function
    const tmdbApiSecretId = `NF-TmdbApiKeySecret-${env}`;
    const tmdbApiKeySecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      tmdbApiSecretId,
      tmdbApiSecretId
    );
    tmdbApiKeySecret.grantRead(traktSearchMovieFunction);

    // Trakt Get Trend Movie construct
    const { traktGetTrendMovieFunction } = traktGetTrendMovieConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(traktGetTrendMovieFunction);
    ignoreTable.grantReadData(traktGetTrendMovieFunction);

    // Assign read permission from trakt api secret to trakt get trend movie function
    traktApiKeySecret.grantRead(traktGetTrendMovieFunction);

    // Assign read permission from tmdb api secret to get trend movie function
    tmdbApiKeySecret.grantRead(traktGetTrendMovieFunction);

    // Trakt Recommend Movie Construct
    const { traktRecommendMovieFunction } = traktRecommendMovieConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(traktRecommendMovieFunction);
    ignoreTable.grantReadData(traktRecommendMovieFunction);

    // Assign read permission from trakt api secret to trakt recommend movie function
    traktApiKeySecret.grantRead(traktRecommendMovieFunction);

    // Assign read permission from tmdb api secret to trakt recommend movie function
    tmdbApiKeySecret.grantRead(traktRecommendMovieFunction);

    // Trakt Get Detail Movie construct
    const { traktGetDetailMovieFunction } = traktGetDetailMovieConstruct({
      scope: this,
      env,
    });

    // Assign read permission from trakt api secret to trakt get detail movie function
    traktApiKeySecret.grantRead(traktGetDetailMovieFunction);

    // Assign read permission from tmdb api secret to trakt get detail movie function
    tmdbApiKeySecret.grantRead(traktGetDetailMovieFunction);

    // Trakt Search Show construct
    const { traktSearchShowFunction } = traktSearchShowConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(traktSearchShowFunction);
    ignoreTable.grantReadData(traktSearchShowFunction);

    // Assign read permission from trakt api secret to trakt search show function
    traktApiKeySecret.grantRead(traktSearchShowFunction);

    // Assign read permission from tmdb api secret to trakt search show function
    tmdbApiKeySecret.grantRead(traktSearchShowFunction);

    // Trakt Get Trend Show construct
    const { traktGetTrendShowFunction } = traktGetTrendShowConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(traktGetTrendShowFunction);
    ignoreTable.grantReadData(traktGetTrendShowFunction);

    // Assign read permission from trakt api secret to trakt get trend show function
    traktApiKeySecret.grantRead(traktGetTrendShowFunction);

    // Assign read permission from tmdb api secret to get trend show function
    tmdbApiKeySecret.grantRead(traktGetTrendShowFunction);

    // Trakt Recommend Show Construct
    const { traktRecommendShowFunction } = traktRecommendShowConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(traktRecommendShowFunction);
    ignoreTable.grantReadData(traktRecommendShowFunction);

    // Assign read permission from trakt api secret to trakt recommend show function
    traktApiKeySecret.grantRead(traktRecommendShowFunction);

    // Assign read permission from tmdb api secret to trakt recommend show function
    tmdbApiKeySecret.grantRead(traktRecommendShowFunction);

    // Trakt Get Detail Show construct
    const { traktGetDetailShowFunction } = traktGetDetailShowConstruct({
      scope: this,
      env,
    });

    // Assign read permission from trakt api secret to trakt get detail show function
    traktApiKeySecret.grantRead(traktGetDetailShowFunction);

    // Assign read permission from tmdb api secret to trakt get detail show function
    tmdbApiKeySecret.grantRead(traktGetDetailShowFunction);

    // Create Favorite Item construct
    const { createFavoriteItemFunction } = createFavoriteItemConstruct({
      scope: this,
      env,
      tableName: favoriteTable.tableName,
    });
    favoriteTable.grantReadWriteData(createFavoriteItemFunction);

    // Delete Favorite Item construct
    const { deleteFavoriteItemFunction } = deleteFavoriteItemConstruct({
      scope: this,
      env,
      tableName: favoriteTable.tableName,
    });
    favoriteTable.grantReadWriteData(deleteFavoriteItemFunction);

    // Read Favorite Item construct
    const { readFavoriteItemFunction } = readFavoriteItemConstruct({
      scope: this,
      env,
      tableName: favoriteTable.tableName,
    });
    favoriteTable.grantReadData(readFavoriteItemFunction);

    // Create Ignore Item construct
    const { createIgnoreItemFunction } = createIgnoreItemConstruct({
      scope: this,
      env,
      tableName: ignoreTable.tableName,
    });
    ignoreTable.grantReadWriteData(createIgnoreItemFunction);

    // Delete Ignore Item construct
    const { deleteIgnoreItemFunction } = deleteIgnoreItemConstruct({
      scope: this,
      env,
      tableName: ignoreTable.tableName,
    });
    ignoreTable.grantReadWriteData(deleteIgnoreItemFunction);

    // Read Ignore Item construct
    const { readIgnoreItemFunction } = readIgnoreItemConstruct({
      scope: this,
      env,
      tableName: ignoreTable.tableName,
    });
    ignoreTable.grantReadData(readIgnoreItemFunction);

    // Jikan Search Anime Construct
    const { jikanSearchAnimeFunction } = jikanSearchAnimeConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(jikanSearchAnimeFunction);
    ignoreTable.grantReadData(jikanSearchAnimeFunction);

    // Jikan Recommend Anime Construct
    const { jikanRecommendAnimeFunction } = jikanRecommendAnimeConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(jikanRecommendAnimeFunction);
    ignoreTable.grantReadData(jikanRecommendAnimeFunction);

    // Jikan Get Trend Anime construct
    const { jikanGetTrendAnimeFunction } = jikanGetTrendAnimeConstruct({
      scope: this,
      env,
      favoriteTableName: favoriteTable.tableName,
      ignoreTableName: ignoreTable.tableName,
    });
    favoriteTable.grantReadData(jikanGetTrendAnimeFunction);
    ignoreTable.grantReadData(jikanGetTrendAnimeFunction);

    // Jikan Get Detail Anime construct
    const { jikanGetDetailAnimeFunction } = jikanGetDetailAnimeConstruct({
      scope: this,
      env,
    });

    // API Gateway construct
    apiGatewayConstruct({
      scope: this,
      env,
      oauthTokenFunction,
      loginFunction,
      signupFunction,
      userConfirmationFunction,
      createRecommendSourceFunction,
      checkAdminGroupFunction,
      traktSearchMovieFunction,
      createFavoriteItemFunction,
      cognitoAuthorizer,
      deleteFavoriteItemFunction,
      createIgnoreItemFunction,
      deleteIgnoreItemFunction,
      traktGetTrendMovieFunction,
      traktRecommendMovieFunction,
      readFavoriteItemFunction,
      readIgnoreItemFunction,
      traktRecommendShowFunction,
      traktGetTrendShowFunction,
      traktSearchShowFunction,
      traktGetDetailMovieFunction,
      traktGetDetailShowFunction,
      jikanSearchAnimeFunction,
      jikanRecommendAnimeFunction,
      jikanGetTrendAnimeFunction,
      jikanGetDetailAnimeFunction,
      getUserFunction,
      getAllRecommendSourcesFunction,
    });
  }
}
