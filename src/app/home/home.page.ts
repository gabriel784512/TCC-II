import { Component } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { SpeechRecognition } from '@ionic-native/speech-recognition/ngx';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { TextToSpeech } from '@ionic-native/text-to-speech/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { SQLite, SQLiteObject } from '@ionic-native/sqlite/ngx';
import { Network } from '@ionic-native/network/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  
  textoTraduzido: string = "";
  distancia: string = "";
  name_model: string = ""; 
  readonly database_name: string = "TCC.db"; 
  readonly table_name: string = "produtos"; 
  locationCoords: any;
  row_data: any = []; 
  databaseObj: SQLiteObject; 

  constructor(private speechRecognition: SpeechRecognition, private screenOrientation: ScreenOrientation, private statusBar: StatusBar, 
              private tts: TextToSpeech, public loadingController: LoadingController, private vibration: Vibration, private androidPermissions: AndroidPermissions,
              private geolocation: Geolocation, private locationAccuracy: LocationAccuracy, private sqlite: SQLite, private network: Network) {
    this.locationCoords = {
      latitude: "",
      longitude: ""
    }
    this.network.onDisconnect().subscribe(() => {
      this.playVoz('Por favor verifique sua conexão com a internet!');
    });    
    /*
    this.network.onConnect().subscribe(() => {
      this.playVoz('Conexão com a internet restabelecida!');
    });*/
  }


  /**
  * @param {_text}
  * @param {_time}
  * @param {_lat1}
  * @param {_lon1}
  * @param {_lat2} 
  * @param {_lon2}
  * @param {_produto}
  * @param {_nomeProd}
  * @param {_marca}
  * @param {_dataValid}
  * @param {_preco}
  * @param {_peso}
  * @param {_latitude}
  * @param {_longitude}
  * @param {_opcao}
  */

  ngOnInit(){
    // Definindo sempre modo retrato
    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);

    // Deixa claro o statusBar do celular
    this.statusBar.styleBlackOpaque();

    this.initializeNetworkEvents()
  }

  initializeNetworkEvents(){
    if (this.network.type == 'none'){
      this.playVoz('Por favor verifique sua conexão com a internet!');
    }else{
      this.checkVozPermission();
      setTimeout(() => { this.checkGPSPermission() }, 4000);
      this.createDB();
    }
  }

  checkVozPermission(){
    // Verificando a permissao de voz e solicita permissao
    this.speechRecognition.hasPermission()
    .then((hasPermission: boolean) => {
      if (!hasPermission){           
        this.speechRecognition.requestPermission()
      }
    });
  }

  checkGPSPermission(){
    // Verifique se o aplicativo tem permissão de acesso GPS
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
    .then(result =>{
      if (result.hasPermission){
        //Se tiver permissão, mostre a caixa de diálogo "Ativar GPS"
        this.askToTurnOnGPS(1);
      }else{
        //Se não tiver permissão, peça permissão
        this.requestGPSPermission();
      }
    });
  }

  askToTurnOnGPS(_opcao){    
    this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY)
    .then(() => {
      // Quando o GPS ativar o método de chamada vai obter as coordenadas da localização precisa do celular  
      if(_opcao == 2){
        this.getLocationCoordinates(); 
      }                    
    }).catch(() => {         
      this.playVoz('Erro ao solicitar permissão de localização!');
    });
  }

  requestGPSPermission(){
    this.locationAccuracy.canRequest()
    .then((canRequest: boolean) => {
      if (canRequest){
        console.log("Sucesso Permissao GPS!");
      }else{
        //Mostrar o diálogo 'Solicitação de permissão GPS'
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
        .then(() => {
          //Método de chamada para ativar o GPS
          this.askToTurnOnGPS(1);          
        })
      }
    });
  }

  // Metodo para obter coordenadas precisas do dispositivo usando o GPS do dispositivo
  getLocationCoordinates(){
    this.geolocation.getCurrentPosition()
    .then((resp) => {
      this.locationCoords.latitude = resp.coords.latitude;
      this.locationCoords.longitude = resp.coords.longitude;  
      
      this.playVoz('Por favor informe o produto que deseja encontrar!');
      this.controlerCarregamento('Por favor informe o produto que deseja encontrar...', 3000);
      setTimeout(() => { this.startVoz() }, 3050);
      
    }).catch(() => {
      this.playVoz('Erro ao obter a localização!');            
    });
  }

  PesquisaProd(){  
    if (this.network.type != 'none'){  
      this.askToTurnOnGPS(2);
    }else{
      this.playVoz('Não será possível kkkkkkkk consultar o produto, pois não possui conexão com a internet!');
    }
  }

  startVoz(){
    // Processo de reconhecimento de voz
    let options = {
      language: 'pt-BR',
      matches: 1,
      prompt: 'Estou te ouvindo! :)',  
      showPopup: true,                
    }
    
    this.speechRecognition.startListening(options).subscribe(matches => {
      if(matches && matches.length > 0){
        this.textoTraduzido = matches[0]
        this.playVoz('Aguarde, localizando produto!')
        this.controlerCarregamento('Aguarde, encontrando produto...', 3000)
        setTimeout(() => { this.getRows(this.textoTraduzido) }, 3050)                 
      }
    },(onerror) => {
      console.log('error:', onerror);    
    })
  }

  playVoz(_text){
    // Processo de falar
    this.tts.speak({
      text : _text,
      locale: 'pt-BR',
      rate: 1
    }).then(() => {
      console.log('Successo!!');
    }).catch((reason: any) => {
      console.log(reason);
    })
  }

  async controlerCarregamento(_text, _time) {
    const loading = await this.loadingController.create({
      spinner: "lines",
      duration: _time,
      message: _text,
      cssClass: 'custom-class custom-loading'
    });
    
    await loading.present();
    await loading.onDidDismiss();
    return console.log('Sucesso!');
  }

  calculaDistancia(_lat1, _lon1, _lat2, _lon2){
    var deg2rad = 0.017453292519943295; // Math.PI / 180
    var cos = Math.cos;

    _lat1 *= deg2rad;
    _lon1 *= deg2rad;
    _lat2 *= deg2rad;
    _lon2 *= deg2rad;

    var diam = 12742; // Diâmetro da terra em km
    var dLat = _lat2 - _lat1;
    var dLon = _lon2 - _lon1;
    var a = ((1 - cos(dLat)) + 
             (1 - cos(dLon)) * cos(_lat1) * cos(_lat2)) / 2;

    this.distancia = (diam * Math.asin(Math.sqrt(a)) * 1000).toFixed(0);

    return this.distancia;
  }

  createDB(){
    this.sqlite.create({
      name: this.database_name,
      location: 'default'
    })
    .then((db: SQLiteObject) => {
      this.databaseObj = db;
      this.createTable();
      console.log('DataBase criado!');
    }).catch(e => {
      console.log("error database " + JSON.stringify(e))
    });
  }

  createTable() {
    this.databaseObj.executeSql('CREATE TABLE IF NOT EXISTS ' + this.table_name + ' '+
    '(id_produto INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, '+
    'cod_prod            TEXT NOT NULL, '+
    'nome_prod           TEXT NOT NULL, '+
    'marca_prod          TEXT NOT NULL, '+
    'data_validade_prod  DATE NOT NULL, '+
    'preco_prod          DOUBLE NOT NULL, '+
    'peso                TEXT NOT NULL, '+
    'latitude            TEXT NOT NULL, '+
    'longitude           TEXT NOT NULL) ', [])
    .then(() => {            
      this.insertRow();
      console.log('Table Created!');
    }).catch(e => {
      console.log("error criar tabela " + JSON.stringify(e))
    });
  }
  
  insertRow(){  
    this.databaseObj.executeSql("SELECT COUNT(*) AS qtd FROM " + this.table_name, []) 
    .then((res) => {
      this.row_data = [];
      if (res.rows.item(0).qtd == 0) {
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '1', 'Uva Verde', 'Doce Mel', '2020-10-20', 7.49, '500 gramas', '-10.882311', '-61.968192'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '2', 'Feijão Preto', 'Carioca', '2021-08-10', 8.99, '1 quilo', '-10.719771', '-62.248611'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '3', 'Arroz Integral', 'Tio Urbano', '2022-03-02', 14.39, '5 quilos', '-10.719771', '-62.248611'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '4', 'Leite Integral', 'Italac', '2019-12-04', 2.59, '1 litro', '-10.882311', '-61.968192'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '5', 'Café Tradicional', 'Três Corações', '2021-06-30', 7.99, '500 gramas', '-10.882311', '-61.968192'])
        this.databaseObj.executeSql('INSERT INTO ' + this.table_name + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [null, '6', 'Trigo Tradicional', 'Dona Benta', '2022-11-25', 8.99, '1 quilo', '-10.882311', '-61.968192'])
        .then(() => {          
          console.log('Registros inseridos!');
        }).catch(e => {
          console.log("error inserir registros " + JSON.stringify(e))
        });
      }
    }).catch(e => {
      console.log("error consultar total registros " + JSON.stringify(e))
    });
  }

  getRows(_produto){
    this.databaseObj.executeSql("SELECT nome_prod, marca_prod, data_validade_prod, REPLACE(preco_prod, '.', ' reais e ') || ' centavos' AS preco_prod, peso, latitude, longitude "+
                                "FROM " + this.table_name + " WHERE (nome_prod LIKE ?)", ['%' + _produto + '%'])
    .then((res) => {      
      this.row_data = [];
      if (res.rows.length > 0){        
        for (var i = 0; i < res.rows.length; i++) {                           
          this.localizarProd(res.rows.item(i).nome_prod, res.rows.item(i).marca_prod, res.rows.item(i).data_validade_prod, res.rows.item(i).preco_prod, res.rows.item(i).peso, res.rows.item(i).latitude, res.rows.item(i).longitude);
        }
      } else{
        this.vibration.vibrate(1000);           
        this.playVoz('Produto não encontrado!');
        this.controlerCarregamento('Produto não encontrado...', 2000)
      }
    }).catch(()=> {      
      this.playVoz("Erro ao realizar consulta do produto!")
    });
  }
 
  localizarProd(_nomeProd, _marca, _dataValid, _preco, _peso, _latitude, _longitude){
    this.vibration.vibrate(1000);    

    this.controlerCarregamento('Produto encontrado, o produto se localiza, cerca de ' + this.calculaDistancia(this.locationCoords.latitude, this.locationCoords.longitude, _latitude, _longitude) + ' metros de distância...', 6000); 
    this.playVoz('Produto encontrado, o produto se localiza, cerca de: ' + this.calculaDistancia(this.locationCoords.latitude, this.locationCoords.longitude, _latitude, _longitude) + ' metros de distância!');

    setTimeout(() => { this.controlerCarregamento('Informações do produto...', 15000) }, 6500);
    setTimeout(() => { 
      this.playVoz('Informações do item: '+ 
      'Produto: '+ _nomeProd +', '+        
      'Marca: '+ _marca +', '+
      'Data de Validade: '+ _dataValid +', '+
      'Preço: '+ _preco +', '+
      'Peso: '+ _peso +'')
    }, 8000);
  }
}

